import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  AURA_CATEGORIES,
  AURA_FITS,
  AURA_SILHOUETTES,
  AURA_COLOR_FAMILIES,
  AURA_PATTERNS,
  AURA_MATERIALS,
} from '../src/types/garmentTaxonomy';
import { AuraGarmentModel } from '../src/services/garment-ai/auraGarmentModel';

describe('AURA Phase 11A — Training Infrastructure Suite', () => {
  const configPath = path.resolve(__dirname, '../training/configs/siglip_so400m_garment_v1.yaml');
  const canonicalTaxonomyPath = path.resolve(__dirname, '../data/garment/metadata/canonical_taxonomy.json');
  const datasetManifestPath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.3.json');
  const frozenBlindPath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.3-blind-freeze.json');

  it('validates training configuration schema exists and specifies proper hardware settings', () => {
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, 'utf8');

    expect(content).toContain('google/siglip-so400m-patch14-384');
    expect(content).toContain('batch_size: 4'); // Sized for 4GB VRAM GTX 1650
    expect(content).toContain('gradient_accumulation_steps: 4');
    expect(content).toContain('mixed_precision: "fp16"');
    expect(content).toContain('dataset-v0.3.json');
  });

  it('verifies canonical taxonomy JSON is 100% consistent with TypeScript single source of truth', () => {
    expect(fs.existsSync(canonicalTaxonomyPath)).toBe(true);
    const tax = JSON.parse(fs.readFileSync(canonicalTaxonomyPath, 'utf8'));

    expect(tax.taxonomy_version).toBe('0.3');
    expect(tax.categories.classes).toEqual(AURA_CATEGORIES);
    expect(tax.fits.classes).toEqual(AURA_FITS);
    expect(tax.silhouettes.classes).toEqual(AURA_SILHOUETTES);
    expect(tax.color_families.classes).toEqual(AURA_COLOR_FAMILIES);
    expect(tax.patterns.classes).toEqual(AURA_PATTERNS);
    expect(tax.materials.classes).toEqual(AURA_MATERIALS);
    expect(tax.confidence_refusal_threshold).toBe(0.65);
  });

  it('verifies dataset split isolation: training loader never consumes blind/hard/real-world samples', () => {
    const dataset = JSON.parse(fs.readFileSync(datasetManifestPath, 'utf8'));
    const items = dataset.items || [];

    const trainItems = items.filter((i: any) => i.split === 'train');
    const valItems = items.filter((i: any) => i.split === 'validation');
    const blindItems = items.filter((i: any) => i.split === 'blind_test');
    const hardItems = items.filter((i: any) => i.split === 'hard_test');
    const realWorldItems = items.filter((i: any) => i.split === 'real_world_test');

    expect(trainItems.length).toBe(92);
    expect(valItems.length).toBe(20);
    expect(blindItems.length).toBe(20);
    expect(hardItems.length).toBe(18);
    expect(realWorldItems.length).toBe(16);

    // Cross-split intersection checks
    const trainIds = new Set(trainItems.map((i: any) => i.image_id));
    const blindIds = new Set(blindItems.map((i: any) => i.image_id));
    const hardIds = new Set(hardItems.map((i: any) => i.image_id));
    const realWorldIds = new Set(realWorldItems.map((i: any) => i.image_id));

    blindIds.forEach((id) => expect(trainIds.has(id)).toBe(false));
    hardIds.forEach((id) => expect(trainIds.has(id)).toBe(false));
    realWorldIds.forEach((id) => expect(trainIds.has(id)).toBe(false));
  });

  it('verifies frozen blind test manifest remains strictly frozen and unmutated', () => {
    expect(fs.existsSync(frozenBlindPath)).toBe(true);
    const frozen = JSON.parse(fs.readFileSync(frozenBlindPath, 'utf8'));

    expect(frozen.sample_count).toBe(20);
    expect(frozen.version).toBe('0.3.0-blind-frozen');
    expect(frozen.items.length).toBe(20);
  });

  it('verifies AuraGarmentModel adapter maintains deterministic fallback resilience', async () => {
    const model = new AuraGarmentModel();
    const res = await model.predictAttributes('file:///test_garment.jpg');

    expect(res.model_id).toBe('aura-garment-v1');
    expect(res.labels.category).toBeDefined();
    expect(res.runtime_device).toBeDefined();
    expect(res.confidences.category).toBeGreaterThan(0.5);
  });

  it('verifies experiment garment-exp-0005 artifacts and forensic status', () => {
    const expDir = path.resolve(__dirname, '../training/runs/garment-exp-0005');
    expect(fs.existsSync(expDir)).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'environment.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'dataset_manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'selected_checkpoint.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'metrics.json'))).toBe(true);

    const metrics = JSON.parse(fs.readFileSync(path.join(expDir, 'metrics.json'), 'utf8'));
    expect(metrics.experiment_id).toBe('garment-exp-0005');
    expect(metrics.forensic_status).toContain('FAILED');
    expect(metrics.dataset_verification.total_physical_samples).toBe(166);
    expect(metrics.dataset_verification.split_leakage_detected).toBe(false);
  });

  it('verifies experiment garment-exp-0006 real GPU training artifacts and ONNX export', () => {
    const expDir = path.resolve(__dirname, '../training/runs/garment-exp-0006');
    expect(fs.existsSync(expDir)).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'environment.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'training_log.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'checkpoint', 'best_model.pt'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'checkpoint', 'aura-garment-v1.onnx'))).toBe(true);

    const env = JSON.parse(fs.readFileSync(path.join(expDir, 'environment.json'), 'utf8'));
    expect(env.experiment_id).toBe('garment-exp-0006');
    expect(env.forensic_status).toBe('REAL GPU TRAINING VERIFIED');
    expect(env.epochs_executed).toBe(20);
    expect(env.total_optimizer_steps).toBe(120);
    expect(env.checkpoint_size_bytes).toBeGreaterThan(0);
    expect(env.initial_weight_hash).not.toBe(env.final_weight_hash);
  });

  it('verifies experiment garment-exp-0007 genuine pretrained SigLIP training & forensic audit (Phase 11F)', () => {
    const expDir = path.resolve(__dirname, '../training/runs/garment-exp-0007');
    expect(fs.existsSync(expDir)).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'environment.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'training_log.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'checkpoint', 'best_model.pt'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'metrics.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'forensics', 'pretrained_weight_verification.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'forensics', 'sanity_test.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'forensics', 'forensic_verification.json'))).toBe(true);

    const weightVerif = JSON.parse(fs.readFileSync(path.join(expDir, 'forensics', 'pretrained_weight_verification.json'), 'utf8'));
    expect(weightVerif.experiment_id).toBe('garment-exp-0007');
    expect(weightVerif.backbone_model_name).toBe('google/siglip-so400m-patch14-384');
    expect(weightVerif.is_genuine_pretrained).toBe(true);
    expect(weightVerif.total_backbone_parameters).toBe(428225600);

    const sanityTest = JSON.parse(fs.readFileSync(path.join(expDir, 'forensics', 'sanity_test.json'), 'utf8'));
    expect(sanityTest.status).toBe('PASS');
    expect(sanityTest.final_category_accuracy).toBe(1.0);
    expect(sanityTest.final_loss).toBeLessThan(sanityTest.initial_loss);

    const forensicVerif = JSON.parse(fs.readFileSync(path.join(expDir, 'forensics', 'forensic_verification.json'), 'utf8'));
    expect(forensicVerif.checks.checkpoint_integrity.status).toBe('PASS');
    expect(forensicVerif.checks.pretrained_weights.status).toBe('PASS');
    expect(forensicVerif.checks.sanity_test.status).toBe('PASS');
    expect(forensicVerif.checks.zero_commercial_apis.status).toBe('PASS');
    expect(forensicVerif.checks.split_evaluations.blind_test.status).toBe('REAL_MEASURED');
    expect(forensicVerif.checks.split_evaluations.train.category_top1).toBeGreaterThan(0.7);
  });

  it('verifies experiment garment-exp-0008 lightweight regularized probe & forensic audit (Phase 11G)', () => {
    const expDir = path.resolve(__dirname, '../training/runs/garment-exp-0008');
    expect(fs.existsSync(expDir)).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'environment.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'training_log.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'checkpoint', 'best_model.pt'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'metrics.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'forensics', 'forensic_verification.json'))).toBe(true);

    const env = JSON.parse(fs.readFileSync(path.join(expDir, 'environment.json'), 'utf8'));
    expect(env.experiment_id).toBe('garment-exp-0008');
    expect(env.head_type).toBe('lightweight');
    expect(env.bottleneck_dim).toBe(256);
    expect(env.trainable_parameters).toBe(310586);
    expect(env.initial_heads_hash).not.toBe(env.final_heads_hash);
    expect(env.total_optimizer_steps).toBeGreaterThan(0);

    const forensicVerif = JSON.parse(fs.readFileSync(path.join(expDir, 'forensics', 'forensic_verification.json'), 'utf8'));
    expect(forensicVerif.checks.checkpoint_integrity.status).toBe('PASS');
    expect(forensicVerif.checks.architecture.status).toBe('PASS');
    expect(forensicVerif.checks.architecture.head_type).toBe('lightweight');
    expect(forensicVerif.checks.architecture.bottleneck_dim).toBe(256);
    expect(forensicVerif.checks.parameter_counts.matches_expected).toBe(true);
    expect(forensicVerif.checks.zero_commercial_apis.status).toBe('PASS');
    expect(forensicVerif.checks.split_evaluations.blind_test.status).toBe('REAL_MEASURED');
    expect(forensicVerif.checks.split_evaluations.real_world_test.status).toBe('REAL_MEASURED');
  });

  it('verifies experiment garment-exp-0009 512-dim intermediate probe & forensic audit (Phase 11H)', () => {
    const expDir = path.resolve(__dirname, '../training/runs/garment-exp-0009');
    expect(fs.existsSync(expDir)).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'environment.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'training_log.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'checkpoint', 'best_model.pt'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'metrics.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'forensics', 'forensic_verification.json'))).toBe(true);

    const env = JSON.parse(fs.readFileSync(path.join(expDir, 'environment.json'), 'utf8'));
    expect(env.experiment_id).toBe('garment-exp-0009');
    expect(env.head_type).toBe('lightweight');
    expect(env.bottleneck_dim).toBe(512);
    expect(env.trainable_parameters).toBe(621114);
    expect(env.initial_heads_hash).not.toBe(env.final_heads_hash);
    expect(env.total_optimizer_steps).toBeGreaterThan(0);

    const forensicVerif = JSON.parse(fs.readFileSync(path.join(expDir, 'forensics', 'forensic_verification.json'), 'utf8'));
    expect(forensicVerif.checks.checkpoint_integrity.status).toBe('PASS');
    expect(forensicVerif.checks.architecture.status).toBe('PASS');
    expect(forensicVerif.checks.architecture.head_type).toBe('lightweight');
    expect(forensicVerif.checks.architecture.bottleneck_dim).toBe(512);
    expect(forensicVerif.checks.parameter_counts.matches_expected).toBe(true);
    expect(forensicVerif.checks.zero_commercial_apis.status).toBe('PASS');
    expect(forensicVerif.checks.split_evaluations.blind_test.status).toBe('REAL_MEASURED');
    expect(forensicVerif.checks.split_evaluations.hard_test.status).toBe('REAL_MEASURED');
    expect(forensicVerif.checks.split_evaluations.real_world_test.status).toBe('REAL_MEASURED');
  });

  it('verifies experiment garment-exp-0010 loss-weighted probe & forensic audit (Phase 11I)', () => {
    const expDir = path.resolve(__dirname, '../training/runs/garment-exp-0010');
    expect(fs.existsSync(expDir)).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'environment.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'training_log.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'checkpoint', 'best_model.pt'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'metrics.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'forensics', 'forensic_verification.json'))).toBe(true);

    const env = JSON.parse(fs.readFileSync(path.join(expDir, 'environment.json'), 'utf8'));
    expect(env.experiment_id).toBe('garment-exp-0010');
    expect(env.head_type).toBe('lightweight');
    expect(env.bottleneck_dim).toBe(256);
    expect(env.trainable_parameters).toBe(310586);
    expect(env.loss_weights.material).toBe(1.5);
    expect(env.loss_weights.color).toBe(1.25);
    expect(env.loss_weights.pattern).toBe(1.1);
    expect(env.initial_heads_hash).not.toBe(env.final_heads_hash);
    expect(env.total_optimizer_steps).toBeGreaterThan(0);

    const forensicVerif = JSON.parse(fs.readFileSync(path.join(expDir, 'forensics', 'forensic_verification.json'), 'utf8'));
    expect(forensicVerif.checks.checkpoint_integrity.status).toBe('PASS');
    expect(forensicVerif.checks.architecture.status).toBe('PASS');
    expect(forensicVerif.checks.architecture.head_type).toBe('lightweight');
    expect(forensicVerif.checks.architecture.bottleneck_dim).toBe(256);
    expect(forensicVerif.checks.loss_weights.status).toBe('PASS');
    expect(forensicVerif.checks.parameter_counts.matches_expected).toBe(true);
    expect(forensicVerif.checks.zero_commercial_apis.status).toBe('PASS');
    expect(forensicVerif.checks.split_evaluations.blind_test.status).toBe('REAL_MEASURED');
    expect(forensicVerif.checks.split_evaluations.real_world_test.status).toBe('REAL_MEASURED');
  });

  it('verifies dataset governance registry and manifest tier separation (Phase 11J)', () => {
    const regPath = path.resolve(__dirname, '../data/garment/metadata/external-dataset-registry.json');
    const prodPath = path.resolve(__dirname, '../data/garment/metadata/production-training-manifest.json');
    const resPath = path.resolve(__dirname, '../data/garment/metadata/research-training-manifest.json');
    const blindPath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.3-blind-freeze.json');

    expect(fs.existsSync(regPath)).toBe(true);
    expect(fs.existsSync(prodPath)).toBe(true);
    expect(fs.existsSync(resPath)).toBe(true);
    expect(fs.existsSync(blindPath)).toBe(true);

    const registry = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    expect(registry.ownership_policy).toBe('ZERO_COMMERCIAL_AI_APIS');
    const df = registry.datasets.find((d: any) => d.dataset_id === 'deepfashion-inshop');
    expect(df.tier).toBe('TIER_C');
    expect(df.commercial_training_allowed).toBe(false);

    const prodManifest = JSON.parse(fs.readFileSync(prodPath, 'utf8'));
    expect(prodManifest.production_eligible).toBe(true);
    expect(prodManifest.items.length).toBe(166);
    for (const item of prodManifest.items) {
      expect(['TIER_A', 'TIER_B']).toContain(item.tier);
      expect(['APPROVED_FOR_AURA_TRAINING', 'APPROVED_WITH_ATTRIBUTION']).toContain(item.license_status);
    }

    const resManifest = JSON.parse(fs.readFileSync(resPath, 'utf8'));
    expect(resManifest.production_eligible).toBe(false);

    const blindRaw = fs.readFileSync(blindPath);
    const blindHash = crypto.createHash('sha256').update(blindRaw).digest('hex');
    expect(blindHash).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');
  });

  it('verifies experiment garment-exp-0011 representation adaptation pilot & drift audit (Phase 11J)', () => {
    const expDir = path.resolve(__dirname, '../training/runs/garment-exp-0011');
    expect(fs.existsSync(expDir)).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'environment.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'training_log.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'checkpoint', 'best_model.pt'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'metrics.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'forensics', 'pretrained_weight_verification.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'forensics', 'representation_drift_audit.json'))).toBe(true);

    const env = JSON.parse(fs.readFileSync(path.join(expDir, 'environment.json'), 'utf8'));
    expect(env.experiment_id).toBe('garment-exp-0011');
    expect(env.unfreeze_last_n_layers).toBe(1);
    expect(env.trainable_backbone_parameters).toBe(30480160);
    expect(env.trainable_head_parameters).toBe(310586);
    expect(env.trainable_parameters).toBe(30790746);
    expect(env.initial_heads_hash).not.toBe(env.final_heads_hash);
    expect(env.total_optimizer_steps).toBeGreaterThan(0);

    const drift = JSON.parse(fs.readFileSync(path.join(expDir, 'forensics', 'representation_drift_audit.json'), 'utf8'));
    expect(drift.catastrophic_forgetting_detected).toBe(false);
    expect(drift.mean_cosine_similarity).toBeGreaterThan(0.95);

    const evalBlind = JSON.parse(fs.readFileSync(path.join(expDir, 'evaluations', 'blind_test_evaluation.json'), 'utf8'));
    expect(evalBlind.status).toBe('REAL_MEASURED');
    expect(evalBlind.metrics.category_top1_accuracy).toBe(0.35);
  });

  it('verifies Phase 12 dataset expansion governance, audit outputs, and production manifest v2', () => {
    const prodV2Path = path.resolve(__dirname, '../data/garment/metadata/production-training-manifest-v2.json');
    const auditDir = path.resolve(__dirname, '../training/data-audits/phase12');
    const expansionReportPath = path.resolve(__dirname, '../docs/phase-12-dataset-expansion-report.md');

    expect(fs.existsSync(prodV2Path)).toBe(true);
    expect(fs.existsSync(auditDir)).toBe(true);
    expect(fs.existsSync(expansionReportPath)).toBe(true);

    expect(fs.existsSync(path.join(auditDir, 'dataset_summary.json'))).toBe(true);
    expect(fs.existsSync(path.join(auditDir, 'license_summary.json'))).toBe(true);
    expect(fs.existsSync(path.join(auditDir, 'category_balance.json'))).toBe(true);
    expect(fs.existsSync(path.join(auditDir, 'context_balance.json'))).toBe(true);
    expect(fs.existsSync(path.join(auditDir, 'blind_integrity.json'))).toBe(true);

    const summary = JSON.parse(fs.readFileSync(path.join(auditDir, 'dataset_summary.json'), 'utf8'));
    expect(summary.overall_audit_passed).toBe(true);
    expect(summary.frozen_blind_intact).toBe(true);
    expect(summary.production_purity_pass).toBe(true);

    const prodV2 = JSON.parse(fs.readFileSync(prodV2Path, 'utf8'));
    expect(prodV2.production_eligible).toBe(true);
    expect(prodV2.total_training_validation_count).toBeGreaterThanOrEqual(112);
    for (const item of prodV2.items) {
      expect(['train', 'validation']).toContain(item.split);
      expect(item.training_eligible).toBe(true);
      expect(item.production_eligible).toBe(true);
    }
  });

  it('verifies Phase 12A Milestone 250 target gap analysis, acquisition registry, and audit v12a', () => {
    const trackerPath = path.resolve(__dirname, '../data/garment/metadata/phase12a-acquisition-registry.json');
    const gapAnalysisPath = path.resolve(__dirname, '../training/data-audits/phase12a/target_gap_analysis.json');
    const gapDocPath = path.resolve(__dirname, '../docs/phase-12a-target-gap-analysis.md');
    const auditDir12a = path.resolve(__dirname, '../training/data-audits/phase12a');

    expect(fs.existsSync(trackerPath)).toBe(true);
    expect(fs.existsSync(gapAnalysisPath)).toBe(true);
    expect(fs.existsSync(gapDocPath)).toBe(true);
    expect(fs.existsSync(path.join(auditDir12a, 'milestone_status.json'))).toBe(true);
    expect(fs.existsSync(path.join(auditDir12a, 'blind_integrity.json'))).toBe(true);

    const gap = JSON.parse(fs.readFileSync(gapAnalysisPath, 'utf8'));
    expect(gap.target_milestone).toBe(250);
    expect(gap.additional_required).toBe(84);
    expect(gap.measured_baseline.categories.one_piece).toBe(0);

    const milestoneStatus = JSON.parse(fs.readFileSync(path.join(auditDir12a, 'milestone_status.json'), 'utf8'));
    expect(milestoneStatus.blind_integrity_pass).toBe(true);
    expect(['MILESTONE_250_REACHED', 'PARTIAL', 'NOT_READY']).toContain(milestoneStatus.status);
    expect(milestoneStatus.remaining_gap_to_250).toBe(84);
  });

  it('verifies Phase 12A.1 First-10 Real Garment Intake and forensic audit outputs', () => {
    const auditDir12a = path.resolve(__dirname, '../training/data-audits/phase12a');
    expect(fs.existsSync(path.join(auditDir12a, 'first10_dataset_summary.json'))).toBe(true);
    expect(fs.existsSync(path.join(auditDir12a, 'first10_provenance_report.json'))).toBe(true);
    expect(fs.existsSync(path.join(auditDir12a, 'first10_quality_report.json'))).toBe(true);
    expect(fs.existsSync(path.join(auditDir12a, 'first10_duplicate_report.json'))).toBe(true);
    expect(fs.existsSync(path.join(auditDir12a, 'first10_milestone_status.json'))).toBe(true);

    const first10Status = JSON.parse(fs.readFileSync(path.join(auditDir12a, 'first10_milestone_status.json'), 'utf8'));
    expect(['WAITING_FOR_REAL_IMAGES', 'PARTIAL', 'FIRST_10_APPROVED']).toContain(first10Status.status);
    expect(first10Status.model_training).toBe('NOT_RUN');
    expect(first10Status.blind_test_intact).toBe(true);
    expect(first10Status.blind_test_checksum).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');
  });

  it('verifies Phase 12A.2 Automated Internet Acquisition, attribution manifest, and Tier B staging', () => {
    const whitelistPath = path.resolve(__dirname, '../data/garment/metadata/approved-image-sources.json');
    const registryPath = path.resolve(__dirname, '../data/garment/metadata/internet-acquisition-registry.json');
    const attributionPath = path.resolve(__dirname, '../data/garment/metadata/attribution-manifest.json');
    const approvedManifestPath = path.resolve(__dirname, '../data/garment/metadata/internet-tier-b-approved.json');
    const candidates04Path = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.4-candidates.json');
    const auditDirNet = path.resolve(__dirname, '../training/data-audits/phase12a/internet');

    expect(fs.existsSync(whitelistPath)).toBe(true);
    expect(fs.existsSync(registryPath)).toBe(true);
    expect(fs.existsSync(attributionPath)).toBe(true);
    expect(fs.existsSync(approvedManifestPath)).toBe(true);
    expect(fs.existsSync(candidates04Path)).toBe(true);
    expect(fs.existsSync(auditDirNet)).toBe(true);

    const whitelist = JSON.parse(fs.readFileSync(whitelistPath, 'utf8'));
    expect(whitelist.ownership_policy).toBe('ZERO_COMMERCIAL_AI_APIS');
    expect(whitelist.sources.some((s: any) => s.source_id === 'wikimedia_commons')).toBe(true);

    const approvedManifest = JSON.parse(fs.readFileSync(approvedManifestPath, 'utf8'));
    expect(approvedManifest.tier).toBe('TIER_B');
    expect(approvedManifest.total_approved_assets).toBeGreaterThanOrEqual(11);
    expect(approvedManifest.production_eligible).toBe(true);

    const attribution = JSON.parse(fs.readFileSync(attributionPath, 'utf8'));
    expect(attribution.attributions.length).toBeGreaterThanOrEqual(11);
    for (const attr of attribution.attributions) {
      expect(attr.author).toBeDefined();
      expect(attr.license).toBeDefined();
      expect(attr.source_url).toBeDefined();
    }

    const auditSummary = JSON.parse(fs.readFileSync(path.join(auditDirNet, 'acquisition_summary.json'), 'utf8'));
    expect(auditSummary.blind_integrity).toBe('PASS');
  });

  it('verifies Phase 12A.3 License Re-Audit, Batch 2 acquisition, and ShareAlike legal segregation', () => {
    const approvedManifestPath = path.resolve(__dirname, '../data/garment/metadata/internet-tier-b-approved.json');
    const prodV2Path = path.resolve(__dirname, '../data/garment/metadata/production-training-manifest-v2.json');
    const attributionPath = path.resolve(__dirname, '../data/garment/metadata/attribution-manifest.json');
    const auditDirNetBatch2 = path.resolve(__dirname, '../training/data-audits/phase12a/internet-batch2');

    expect(fs.existsSync(approvedManifestPath)).toBe(true);
    expect(fs.existsSync(prodV2Path)).toBe(true);
    expect(fs.existsSync(attributionPath)).toBe(true);
    expect(fs.existsSync(auditDirNetBatch2)).toBe(true);

    const approvedManifest = JSON.parse(fs.readFileSync(approvedManifestPath, 'utf8'));
    expect(approvedManifest.tier).toBe('TIER_B');
    expect(approvedManifest.total_approved_assets).toBe(23);

    // Verify zero ShareAlike in approved production manifest
    for (const item of approvedManifest.items) {
      const lic = item.license_name.toLowerCase();
      expect(lic.includes('-sa') || lic.includes(' sa') || lic.includes('sharealike')).toBe(false);
      expect(item.production_eligible).toBe(true);
      expect(item.training_eligible).toBe(true);
    }

    const prodV2 = JSON.parse(fs.readFileSync(prodV2Path, 'utf8'));
    expect(prodV2.total_training_validation_count).toBe(135);

    const milestoneStatus = JSON.parse(fs.readFileSync(path.join(auditDirNetBatch2, 'milestone_status.json'), 'utf8'));
    expect(milestoneStatus.status).toBe('BATCH_COMPLETE');
    expect(milestoneStatus.blind_test_intact).toBe(true);
    expect(milestoneStatus.blind_test_checksum).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');
    expect(milestoneStatus.production_train_val_pool).toBe(135);
  });
});



