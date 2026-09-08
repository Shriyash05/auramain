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
import { garmentLocalizationService, HeuristicGarmentLocalizationService } from '../src/services/garment-localization';
import { LocalizationReviewTool } from '../tools/ai-benchmark/garment/localizationReviewTool';

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
    expect(milestoneStatus.remaining_gap_to_250).toBeLessThanOrEqual(84);
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
      expect(attr.license || attr.license_name).toBeDefined();
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
    expect(approvedManifest.total_approved_assets).toBeGreaterThanOrEqual(23);

    // Verify zero ShareAlike in approved production manifest
    for (const item of approvedManifest.items) {
      const lic = item.license_name.toLowerCase();
      expect(lic.includes('-sa') || lic.includes(' sa') || lic.includes('sharealike')).toBe(false);
      expect(item.production_eligible).toBe(true);
      expect(item.training_eligible).toBe(true);
    }

    const prodV2 = JSON.parse(fs.readFileSync(prodV2Path, 'utf8'));
    expect(prodV2.total_training_validation_count).toBeGreaterThanOrEqual(135);

    const milestoneStatus = JSON.parse(fs.readFileSync(path.join(auditDirNetBatch2, 'milestone_status.json'), 'utf8'));
    expect(milestoneStatus.status).toBe('BATCH_COMPLETE');
    expect(milestoneStatus.blind_test_intact).toBe(true);
    expect(milestoneStatus.blind_test_checksum).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');
    expect(milestoneStatus.production_train_val_pool).toBe(135);
  });

  it('verifies Phase 12A.4 High-Speed Acquisition Engine, concurrency, and performance report', () => {
    const approvedManifestPath = path.resolve(__dirname, '../data/garment/metadata/internet-tier-b-approved.json');
    const prodV2Path = path.resolve(__dirname, '../data/garment/metadata/production-training-manifest-v2.json');
    const attributionPath = path.resolve(__dirname, '../data/garment/metadata/attribution-manifest.json');
    const auditDirNetBatch3 = path.resolve(__dirname, '../training/data-audits/phase12a/internet-batch3');

    expect(fs.existsSync(approvedManifestPath)).toBe(true);
    expect(fs.existsSync(prodV2Path)).toBe(true);
    expect(fs.existsSync(attributionPath)).toBe(true);
    expect(fs.existsSync(auditDirNetBatch3)).toBe(true);

    const approvedManifest = JSON.parse(fs.readFileSync(approvedManifestPath, 'utf8'));
    expect(approvedManifest.tier).toBe('TIER_B');
    expect(approvedManifest.total_approved_assets).toBe(29);

    const prodV2 = JSON.parse(fs.readFileSync(prodV2Path, 'utf8'));
    expect(prodV2.total_training_validation_count).toBeGreaterThanOrEqual(141);

    const attribution = JSON.parse(fs.readFileSync(attributionPath, 'utf8'));
    expect(attribution.attributions.length).toBeGreaterThanOrEqual(29);

    const perfReport = JSON.parse(fs.readFileSync(path.join(auditDirNetBatch3, 'performance.json'), 'utf8'));
    expect(perfReport.pipeline_version).toContain('high-speed');
    expect(perfReport.concurrency).toBe(6);
    expect(perfReport.candidates_per_minute).toBeGreaterThan(100);

    const milestoneStatus = JSON.parse(fs.readFileSync(path.join(auditDirNetBatch3, 'milestone_status.json'), 'utf8'));
    expect(milestoneStatus.status).toBe('ACQUISITION_PIPELINE_OPTIMIZED');
    expect(milestoneStatus.blind_test_intact).toBe(true);
    expect(milestoneStatus.blind_test_checksum).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');
    expect(milestoneStatus.production_train_val_pool).toBe(141);
  });

  it('verifies Phase 12A.5 Modern Fashion Discovery Layer, forensic provenance audit, and placeholder rejection', () => {
    const discoveryRegistryPath = path.resolve(__dirname, '../data/garment/metadata/modern-fashion-discovery-registry.json');
    const auditDirModern = path.resolve(__dirname, '../training/data-audits/modern-discovery');

    expect(fs.existsSync(discoveryRegistryPath)).toBe(true);
    expect(fs.existsSync(auditDirModern)).toBe(true);

    const registry = JSON.parse(fs.readFileSync(discoveryRegistryPath, 'utf8'));
    expect(registry.platform_policy.primary_discovery_source).toBe('pinterest');
    expect(registry.platform_policy.scraping_policy).toBe('NO_SCRAPING_DISCOVERY_LAYER_ONLY');
    expect(registry.platform_policy.commercial_ai_api_policy).toBe('ZERO_COMMERCIAL_AI_APIS');
    expect(registry.search_themes.length).toBeGreaterThanOrEqual(20);
    expect(registry.kaggle_datasets.length).toBeGreaterThanOrEqual(3);

    // Verify rejection of placeholder domains from training eligibility
    for (const ref of registry.references) {
      if (ref.original_source_domain.includes('example.com') || ref.provenance_status === 'INVALID_PROVENANCE') {
        expect(ref.training_eligible).toBe(false);
      }
    }

    const invalidSources = JSON.parse(fs.readFileSync(path.join(auditDirModern, 'invalid_sources.json'), 'utf8'));
    expect(invalidSources.invalid_sources_count).toBeGreaterThan(0);

    const summary = JSON.parse(fs.readFileSync(path.join(auditDirModern, 'audit_summary.json'), 'utf8'));
    expect(summary.status).toBe('INVALID_DISCOVERY');
    expect(summary.invalid_in_production_manifest).toBe(0);
    expect(summary.no_pinterest_scraping).toBe(true);
    expect(summary.no_commercial_ai_api_usage).toBe(true);
    expect(summary.blind_test_intact).toBe(true);
    expect(summary.blind_test_checksum).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');
  });

  it('verifies Phase 12A.6 Real Source Discovery, Kaggle dataset shortlist, and modern discovery v2', () => {
    const kaggleRegistryPath = path.resolve(__dirname, '../data/garment/metadata/kaggle-fashion-dataset-registry.json');
    const discoveryRegistryV2Path = path.resolve(__dirname, '../data/garment/metadata/modern-fashion-discovery-registry-v2.json');
    const auditDirModernV2 = path.resolve(__dirname, '../training/data-audits/modern-discovery-v2');

    expect(fs.existsSync(kaggleRegistryPath)).toBe(true);
    expect(fs.existsSync(discoveryRegistryV2Path)).toBe(true);
    expect(fs.existsSync(auditDirModernV2)).toBe(true);

    const kaggleReg = JSON.parse(fs.readFileSync(kaggleRegistryPath, 'utf8'));
    expect(kaggleReg.summary.total_datasets_discovered).toBeGreaterThanOrEqual(5);
    expect(kaggleReg.summary.shortlisted_datasets).toBeGreaterThanOrEqual(3);

    // Verify Alexey Grigorev Clothing Dataset CC0 is approved
    const alexeyDs = kaggleReg.datasets.find((d: any) => d.dataset_id === 'agrigorev_clothing_dataset');
    expect(alexeyDs).toBeDefined();
    expect(alexeyDs.commercial_training_status).toBe('APPROVED');
    expect(alexeyDs.production_eligibility).toBe(true);

    // Verify DeepFashion is research only
    const deepfashion = kaggleReg.datasets.find((d: any) => d.dataset_id === 'deepfashion_in_shop');
    expect(deepfashion.commercial_training_status).toBe('RESEARCH_ONLY');
    expect(deepfashion.production_eligibility).toBe(false);

    const discoveryV2 = JSON.parse(fs.readFileSync(discoveryRegistryV2Path, 'utf8'));
    expect(discoveryV2.summary.invalid_sources).toBe(0);

    for (const ref of discoveryV2.references) {
      expect(ref.domain.includes('example.com')).toBe(false);
      expect(ref.http_status).toBe(200);
      if (ref.domain.includes('unsplash.com')) {
        expect(ref.license).toBe('Unsplash License');
      }
    }

    const auditSummary = JSON.parse(fs.readFileSync(path.join(auditDirModernV2, 'audit_summary.json'), 'utf8'));
    expect(auditSummary.status).toBe('SOURCE_DISCOVERY_READY');
    expect(auditSummary.blind_test_intact).toBe(true);
    expect(auditSummary.blind_test_checksum).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');
  });

  it('verifies Phase 12A.7 Kaggle Clothing Dataset Pilot Ingestion and production merge', () => {
    const pilotApprovedPath = path.resolve(__dirname, '../data/garment/metadata/kaggle-clothing-pilot-approved.json');
    const pilotRegistryPath = path.resolve(__dirname, '../data/garment/metadata/kaggle-clothing-pilot-registry.json');
    const prodV2Path = path.resolve(__dirname, '../data/garment/metadata/production-training-manifest-v2.json');
    const auditDirPilot = path.resolve(__dirname, '../training/data-audits/phase12/kaggle-clothing-pilot');

    expect(fs.existsSync(pilotApprovedPath)).toBe(true);
    expect(fs.existsSync(pilotRegistryPath)).toBe(true);
    expect(fs.existsSync(prodV2Path)).toBe(true);
    expect(fs.existsSync(auditDirPilot)).toBe(true);

    const pilotApproved = JSON.parse(fs.readFileSync(pilotApprovedPath, 'utf8'));
    expect(pilotApproved.total_approved_assets).toBe(100);
    expect(pilotApproved.license_status).toBe('APPROVED_PUBLIC_DOMAIN_CC0');

    for (const item of pilotApproved.items) {
      expect(item.license_name).toContain('CC0');
      expect(item.production_eligible).toBe(true);
      expect(item.training_eligible).toBe(true);
      expect(item.labels.category).toBeDefined();
    }

    const prodV2 = JSON.parse(fs.readFileSync(prodV2Path, 'utf8'));
    expect(prodV2.total_training_validation_count).toBeGreaterThanOrEqual(241);

    const milestoneStatus = JSON.parse(fs.readFileSync(path.join(auditDirPilot, 'milestone_status.json'), 'utf8'));
    expect(milestoneStatus.status).toBe('PILOT_INGESTION_APPROVED_AND_MERGED');
    expect(milestoneStatus.dataset_value).toBe('HIGH_VALUE');
    expect(milestoneStatus.recommendation).toBe('EXPAND_KAGGLE');
    expect(milestoneStatus.blind_test_intact).toBe(true);
    expect(milestoneStatus.blind_test_checksum).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');
  });

  it('verifies Phase 12A.8 Kaggle Source Forensic Audit and Milestone 250 Freeze', () => {
    const milestone250ManifestPath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.4-250.json');
    const milestone250ShaPath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.4-250-manifest.sha256');
    const milestone250FreezePath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.4-250-freeze.json');
    const forensicDocPath = path.resolve(__dirname, '../docs/phase-12a-kaggle-forensic-audit.md');
    const prodV2Path = path.resolve(__dirname, '../data/garment/metadata/production-training-manifest-v2.json');

    expect(fs.existsSync(milestone250ManifestPath)).toBe(true);
    expect(fs.existsSync(milestone250ShaPath)).toBe(true);
    expect(fs.existsSync(milestone250FreezePath)).toBe(true);
    expect(fs.existsSync(forensicDocPath)).toBe(true);

    const manifest250 = JSON.parse(fs.readFileSync(milestone250ManifestPath, 'utf8'));
    expect(manifest250.total_production_training_validation_count).toBe(250);
    expect(manifest250.items.length).toBe(250);

    const prodV2 = JSON.parse(fs.readFileSync(prodV2Path, 'utf8'));
    expect(prodV2.total_training_validation_count).toBe(250);

    // Verify sha256 checksum lock
    const shaFile = fs.readFileSync(milestone250ShaPath, 'utf8').trim();
    const manifestBuf = fs.readFileSync(milestone250ManifestPath);
    const crypto = require('crypto');
    const computedSha = crypto.createHash('sha256').update(manifestBuf).digest('hex');
    expect(shaFile).toBe(computedSha);

    const freezeLock = JSON.parse(fs.readFileSync(milestone250FreezePath, 'utf8'));
    expect(freezeLock.milestone_status).toBe('FROZEN_MILESTONE_250');
    expect(freezeLock.total_assets).toBe(250);
    expect(freezeLock.approved_source_policy).toBe('controlled_expansion');
    expect(freezeLock.blind_holdout_sha256).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');
  });

  it('verifies Phase 12B Exp-0012 Frozen SigLIP Baseline on Dataset-v0.4-250', () => {
    const configPath = path.resolve(__dirname, '../training/configs/siglip_so400m_garment_exp0012.yaml');
    const runDir = path.resolve(__dirname, '../training/runs/garment-exp-0012');
    const ckptPath = path.join(runDir, 'checkpoint', 'best_model.pt');
    const envPath = path.join(runDir, 'environment.json');
    const metricsPath = path.join(runDir, 'metrics.json');
    const forensicsSummaryPath = path.join(runDir, 'forensics', 'forensic_summary.json');
    const comparisonDocPath = path.resolve(__dirname, '../docs/garment-exp-0012-comparison.md');
    const errorDocPath = path.resolve(__dirname, '../docs/garment-exp-0012-error-analysis.md');
    const multiSplitSummaryPath = path.join(runDir, 'evaluations', 'multi_split_summary.json');

    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.existsSync(ckptPath)).toBe(true);
    expect(fs.existsSync(envPath)).toBe(true);
    expect(fs.existsSync(metricsPath)).toBe(true);
    expect(fs.existsSync(forensicsSummaryPath)).toBe(true);
    expect(fs.existsSync(comparisonDocPath)).toBe(true);
    expect(fs.existsSync(errorDocPath)).toBe(true);
    expect(fs.existsSync(multiSplitSummaryPath)).toBe(true);

    const forensicSummary = JSON.parse(fs.readFileSync(forensicsSummaryPath, 'utf8'));
    expect(forensicSummary.status).toBe('FORENSICALLY_VERIFIED');
    expect(forensicSummary.model_architecture.backbone_frozen).toBe(true);
    expect(forensicSummary.model_architecture.bottleneck_dim).toBe(256);
    expect(forensicSummary.training_evidence.total_optimizer_steps).toBeGreaterThan(0);
    expect(forensicSummary.training_evidence.weights_changed).toBe(true);
    expect(forensicSummary.dataset_integrity.manifest_intact).toBe(true);
    expect(forensicSummary.dataset_integrity.blind_intact).toBe(true);
    expect(forensicSummary.dataset_integrity.blind_checksum).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');

    const multiSplit = JSON.parse(fs.readFileSync(multiSplitSummaryPath, 'utf8'));
    expect(multiSplit.train).toBeDefined();
    expect(multiSplit.validation).toBeDefined();
    expect(multiSplit.blind_test).toBeDefined();
    expect(multiSplit.hard_test).toBeDefined();
    expect(multiSplit.real_world_test).toBeDefined();
    expect(multiSplit.train.sample_size).toBe(230);
    expect(multiSplit.validation.sample_size).toBe(20);
    expect(multiSplit.blind_test.sample_size).toBe(20);
    expect(multiSplit.hard_test.sample_size).toBe(18);
    expect(multiSplit.real_world_test.sample_size).toBe(16);
  });

  it('verifies Phase 12C Exp-0013 SigLIP LoRA / PEFT Adaptation on Dataset-v0.4-250', () => {
    const configPath = path.resolve(__dirname, '../training/configs/siglip_so400m_garment_exp0013.yaml');
    const runDir = path.resolve(__dirname, '../training/runs/garment-exp-0013');
    const ckptPath = path.join(runDir, 'checkpoint', 'best_model.pt');
    const envPath = path.join(runDir, 'environment.json');
    const metricsPath = path.join(runDir, 'metrics.json');
    const loraConfigPath = path.join(runDir, 'lora_config.json');
    const forensicsSummaryPath = path.join(runDir, 'forensics', 'forensic_summary.json');
    const comparisonDocPath = path.resolve(__dirname, '../docs/garment-exp-0013-comparison.md');
    const errorDocPath = path.resolve(__dirname, '../docs/garment-exp-0013-error-analysis.md');
    const multiSplitSummaryPath = path.join(runDir, 'evaluations', 'multi_split_summary.json');

    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.existsSync(ckptPath)).toBe(true);
    expect(fs.existsSync(envPath)).toBe(true);
    expect(fs.existsSync(metricsPath)).toBe(true);
    expect(fs.existsSync(loraConfigPath)).toBe(true);
    expect(fs.existsSync(forensicsSummaryPath)).toBe(true);
    expect(fs.existsSync(comparisonDocPath)).toBe(true);
    expect(fs.existsSync(errorDocPath)).toBe(true);
    expect(fs.existsSync(multiSplitSummaryPath)).toBe(true);

    const loraConfig = JSON.parse(fs.readFileSync(loraConfigPath, 'utf8'));
    expect(loraConfig.lora_rank).toBe(8);
    expect(loraConfig.lora_alpha).toBe(16.0);
    expect(loraConfig.lora_target_modules).toEqual(['q_proj', 'v_proj']);
    expect(loraConfig.trainable_lora_parameters).toBe(995328);

    const forensicSummary = JSON.parse(fs.readFileSync(forensicsSummaryPath, 'utf8'));
    expect(forensicSummary.status).toBe('FORENSICALLY_VERIFIED');
    expect(forensicSummary.model_architecture.adaptation_type).toBe('lora');
    expect(forensicSummary.model_architecture.lora_rank).toBe(8);
    expect(forensicSummary.parameter_efficiency.total_trainable_parameters).toBe(1305914);
    expect(forensicSummary.training_evidence.total_optimizer_steps).toBeGreaterThan(0);
    expect(forensicSummary.dataset_integrity.manifest_intact).toBe(true);
    expect(forensicSummary.dataset_integrity.blind_intact).toBe(true);
    expect(forensicSummary.dataset_integrity.blind_checksum).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');
    expect(forensicSummary.representation_drift.representation_collapse).toBe(false);

    const multiSplit = JSON.parse(fs.readFileSync(multiSplitSummaryPath, 'utf8'));
    expect(multiSplit.train.sample_size).toBe(230);
    expect(multiSplit.validation.sample_size).toBe(20);
    expect(multiSplit.blind_test.sample_size).toBe(20);
    expect(multiSplit.hard_test.sample_size).toBe(18);
    expect(multiSplit.real_world_test.sample_size).toBe(16);
  });

  it('verifies Phase 12D Dataset Scale-Up from 250 to 500 Production Assets', () => {
    const dataset500Path = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.5-500.json');
    const freeze500Path = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.5-500-freeze.json');
    const sha500Path = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.5-500-manifest.sha256');
    const dataset250Path = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.4-250.json');
    const sha250Path = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.4-250-manifest.sha256');
    const blindFreezePath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.3-blind-freeze.json');
    const registryPath = path.resolve(__dirname, '../data/garment/metadata/phase12d-acquisition-registry.json');
    const gapAnalysisDoc = path.resolve(__dirname, '../docs/phase-12d-target-gap-analysis.md');
    const qualityAuditPath = path.resolve(__dirname, '../training/data-audits/phase12d/quality_audit.json');
    const diversityAuditPath = path.resolve(__dirname, '../training/data-audits/phase12d/diversity_audit.json');
    const cosineAuditPath = path.resolve(__dirname, '../training/runs/garment-exp-0013/forensics/cosine_similarity_precision_audit.json');

    expect(fs.existsSync(dataset500Path)).toBe(true);
    expect(fs.existsSync(freeze500Path)).toBe(true);
    expect(fs.existsSync(sha500Path)).toBe(true);
    expect(fs.existsSync(dataset250Path)).toBe(true);
    expect(fs.existsSync(sha250Path)).toBe(true);
    expect(fs.existsSync(blindFreezePath)).toBe(true);
    expect(fs.existsSync(registryPath)).toBe(true);
    expect(fs.existsSync(gapAnalysisDoc)).toBe(true);
    expect(fs.existsSync(qualityAuditPath)).toBe(true);
    expect(fs.existsSync(diversityAuditPath)).toBe(true);
    expect(fs.existsSync(cosineAuditPath)).toBe(true);

    // 1. Verify 500 Counts
    const ds500 = JSON.parse(fs.readFileSync(dataset500Path, 'utf8'));
    expect(ds500.total_production_training_validation_count).toBe(500);
    expect(ds500.items.length).toBe(500);
    expect(ds500.train_count).toBe(459);
    expect(ds500.validation_count).toBe(41);

    // 2. Verify 250 Immutability
    const ds250Content = fs.readFileSync(dataset250Path);
    const ds250Hash = crypto.createHash('sha256').update(ds250Content).digest('hex');
    const expected250Hash = fs.readFileSync(sha250Path, 'utf8').trim();
    expect(ds250Hash).toBe(expected250Hash);

    // 3. Verify Frozen Blind Integrity
    const blindContent = fs.readFileSync(blindFreezePath);
    const blindHash = crypto.createHash('sha256').update(blindContent).digest('hex');
    expect(blindHash).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');

    // 4. Verify Quality Audit Status
    const qualityAudit = JSON.parse(fs.readFileSync(qualityAuditPath, 'utf8'));
    expect(qualityAudit.status).toBe('APPROVED');
    expect(qualityAudit.exact_duplicates).toBe(0);
    expect(qualityAudit.corrupt_images).toBe(0);
    expect(qualityAudit.missing_provenance_entries).toBe(0);

    // 5. Verify Precision Cosine Audit for Exp-0013
    const cosineAudit = JSON.parse(fs.readFileSync(cosineAuditPath, 'utf8'));
    expect(cosineAudit.num_probed_images).toBe(50);
    expect(cosineAudit.mean_cosine_similarity).toBeGreaterThan(0.99);
    expect(cosineAudit.representation_collapse).toBe(false);
  });

  it('verifies experiment garment-exp-0014 Frozen SigLIP Control on Dataset-v0.5-500 (Phase 13A)', () => {
    const expDir = path.resolve(__dirname, '../training/runs/garment-exp-0014');
    expect(fs.existsSync(expDir)).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'environment.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'training_log.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'checkpoint', 'best_model.pt'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'metrics.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'forensics', 'forensic_summary.json'))).toBe(true);
    expect(fs.existsSync(path.join(expDir, 'evaluations', 'multi_split_summary.json'))).toBe(true);

    const docReport = path.resolve(__dirname, '../docs/garment-exp-0014-training-report.md');
    const docComp = path.resolve(__dirname, '../docs/garment-exp-0014-comparison.md');
    const docErr = path.resolve(__dirname, '../docs/garment-exp-0014-error-analysis.md');
    expect(fs.existsSync(docReport)).toBe(true);
    expect(fs.existsSync(docComp)).toBe(true);
    expect(fs.existsSync(docErr)).toBe(true);

    const env = JSON.parse(fs.readFileSync(path.join(expDir, 'environment.json'), 'utf8'));
    expect(env.experiment_id).toBe('garment-exp-0014');
    expect(env.backbone_model_name).toBe('google/siglip-so400m-patch14-384');
    expect(env.trainable_backbone_parameters).toBe(0);
    expect(env.trainable_head_parameters).toBe(310586);
    expect(env.train_samples).toBe(459);
    expect(env.validation_samples).toBe(41);
    expect(env.initial_heads_hash).not.toBe(env.final_heads_hash);

    const forensic = JSON.parse(fs.readFileSync(path.join(expDir, 'forensics', 'forensic_summary.json'), 'utf8'));
    expect(forensic.status).toBe('FORENSICALLY_VERIFIED');
    expect(forensic.dataset_integrity.blind_intact).toBe(true);
    expect(forensic.dataset_integrity.manifest_intact).toBe(true);

    const multiSplit = JSON.parse(fs.readFileSync(path.join(expDir, 'evaluations', 'multi_split_summary.json'), 'utf8'));
    expect(multiSplit.train.sample_size).toBe(459);
    expect(multiSplit.validation.sample_size).toBe(41);
    expect(multiSplit.blind_test.sample_size).toBe(20);
    expect(multiSplit.blind_test.metrics.macro_f1).toBeGreaterThan(0.30); // 31.67%
    expect(multiSplit.blind_test.metrics.category_top1_accuracy).toBe(0.45); // 45.0%
    expect(multiSplit.validation.metrics.category_top1_accuracy).toBeGreaterThan(0.60); // 63.41%
  });

  it('verifies Phase 13B Forensic Domain-Generalization Audit and Artifacts', () => {
    const forensicsDir = path.resolve(__dirname, '../training/runs/garment-exp-0014/forensics');
    const predDeltaPath = path.join(forensicsDir, 'prediction_delta.json');
    const confAnalysisPath = path.join(forensicsDir, 'confidence_analysis.json');
    const srcDistPath = path.join(forensicsDir, 'source_distribution.json');
    const domainDistPath = path.join(forensicsDir, 'domain_distribution.json');
    const confusionPath = path.join(forensicsDir, 'confusion_analysis.json');

    const docAudit = path.resolve(__dirname, '../docs/phase-13b-exp0014-domain-audit.md');
    const docPred = path.resolve(__dirname, '../docs/phase-13b-exp0014-prediction-analysis.md');
    const docDist = path.resolve(__dirname, '../docs/phase-13b-exp0014-data-distribution-analysis.md');

    expect(fs.existsSync(predDeltaPath)).toBe(true);
    expect(fs.existsSync(confAnalysisPath)).toBe(true);
    expect(fs.existsSync(srcDistPath)).toBe(true);
    expect(fs.existsSync(domainDistPath)).toBe(true);
    expect(fs.existsSync(confusionPath)).toBe(true);
    expect(fs.existsSync(docAudit)).toBe(true);
    expect(fs.existsSync(docPred)).toBe(true);
    expect(fs.existsSync(docDist)).toBe(true);

    const predDelta = JSON.parse(fs.readFileSync(predDeltaPath, 'utf8'));
    expect(predDelta.blind_test.length).toBe(20);
    expect(predDelta.real_world_test.length).toBe(16);

    const confAnalysis = JSON.parse(fs.readFileSync(confAnalysisPath, 'utf8'));
    expect(confAnalysis.real_world_test.exp0014.refusal_rate).toBeGreaterThan(0.9); // 93.75%
    expect(confAnalysis.real_world_test.exp0012.refusal_rate).toBe(1.0); // 100%

    const domainDist = JSON.parse(fs.readFileSync(domainDistPath, 'utf8'));
    expect(domainDist.statistical_tests.real_world_mcnemar_pvalue).toBeGreaterThan(0.05); // p = 0.0625, not statistically significant
  });

  it('verifies Phase 13C Garment Localization, Review Tool, and Oracle Crop Study', async () => {
    // 1. Verify Localization Service Proposal Output
    const proposals = await garmentLocalizationService.localizeGarments('assets/test.jpg');
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals[0].bbox.x).toBeGreaterThanOrEqual(0);
    expect(proposals[0].bbox.x).toBeLessThanOrEqual(1);
    expect(proposals[0].bbox.width).toBeGreaterThan(0);

    // 2. Verify IoU Calculation Logic
    const iou = HeuristicGarmentLocalizationService.computeIoU(
      { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
      { x: 0.1, y: 0.1, width: 0.5, height: 0.5 }
    );
    expect(iou).toBe(1.0);

    // 3. Verify Ground Truth Annotations File
    const gtPath = path.resolve(__dirname, '../training/data-audits/phase13c/localization_ground_truth.json');
    expect(fs.existsSync(gtPath)).toBe(true);
    const gt = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
    expect(gt.total_annotated_images).toBe(16);
    expect(gt.annotations.length).toBe(16);

    // 4. Verify Oracle Crop Results
    const oraclePath = path.resolve(__dirname, '../training/data-audits/phase13c/oracle_crop_results.json');
    const summaryPath = path.resolve(__dirname, '../training/data-audits/phase13c/localization_summary.json');
    const auditPath = path.resolve(__dirname, '../training/data-audits/phase13c/forensic_localization_audit.json');

    expect(fs.existsSync(oraclePath)).toBe(true);
    expect(fs.existsSync(summaryPath)).toBe(true);
    expect(fs.existsSync(auditPath)).toBe(true);

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    expect(summary.sample_size).toBe(16);
    expect(summary.oracle_crop_performance.category_accuracy).toBeGreaterThanOrEqual(summary.full_image_baseline.category_accuracy);

    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    expect(audit.status).toBe('FORENSICALLY_VERIFIED');
    expect(audit.blind_freeze_pass).toBe(true);
    expect(audit.checkpoint_pass).toBe(true);
    expect(audit.ground_truth_coordinates_valid).toBe(true);
    expect(audit.physical_crops_verified).toBe(true);
  });

  it('verifies Phase 13D Exp-0015 Emergency Forensic Recovery, Root-Cause Audit, and Checkpoint Guards', () => {
    const recoveryDir = path.resolve(__dirname, '../training/runs/garment-exp-0015/forensics/recovery');
    const recoverySummaryPath = path.join(recoveryDir, 'recovery_summary.json');
    const recoveryCompPath = path.join(recoveryDir, 'checkpoint_forensic_comparison.json');
    const docRecoveryPath = path.resolve(__dirname, '../docs/garment-exp-0015-forensic-recovery.md');

    expect(fs.existsSync(recoverySummaryPath)).toBe(true);
    expect(fs.existsSync(recoveryCompPath)).toBe(true);
    expect(fs.existsSync(docRecoveryPath)).toBe(true);

    const recovery = JSON.parse(fs.readFileSync(recoverySummaryPath, 'utf8'));
    expect(recovery.experiment_id).toBe('garment-exp-0015');
    expect(recovery.run_status).toBe('INTERRUPTED');
    expect(recovery.validation_status).toBe('NOT_VALIDATED');
    expect(recovery.production_status).toBe('NOT_PRODUCTION_ELIGIBLE');
    expect(recovery.blind_test_intact).toBe(true);

    // Verify Checkpoint Deconstruction
    expect(recovery.checkpoint.lora_parameters).toBe(995328);
    expect(recovery.checkpoint.heads_parameters).toBe(310586);
    expect(recovery.checkpoint.frozen_backbone_parameters_leaked).toBe(428225600);

    // Verify Safety Fixes in Training Codebase
    expect(recovery.fixes_implemented.pure_lora_adapter_serialization).toBe(true);
    expect(recovery.fixes_implemented.parameter_guard_enforced).toBe(true);
    expect(recovery.fixes_implemented.checkpoint_size_sanity_guard_enforced).toBe(true);
    expect(recovery.fixes_implemented.training_heartbeat_enabled).toBe(true);
    expect(recovery.fixes_implemented.max_hours_execution_limit_enabled).toBe(true);
  });

  it('verifies Phase 13D.1 Training Performance Optimization, Batch Benchmark, and Checkpoint Guards', () => {
    const perfDir = path.resolve(__dirname, '../training/runs/garment-exp-0015/forensics/performance');
    const batchBenchPath = path.join(perfDir, 'batch_benchmark.json');
    const dataloaderBenchPath = path.join(perfDir, 'dataloader_benchmark.json');
    const prepBenchPath = path.join(perfDir, 'preprocessing_benchmark.json');
    const ckptBenchPath = path.join(perfDir, 'checkpoint_benchmark.json');
    const recCfgPath = path.join(perfDir, 'recommended_configuration.json');
    const sanityDir = path.resolve(__dirname, '../training/runs/EXP-0015-PERFORMANCE-SANITY');
    const sanityHeartbeatPath = path.join(sanityDir, 'training_heartbeat.json');
    const sanityCkptPath = path.join(sanityDir, 'checkpoint/best_model.pt');

    // 1. Benchmark artifacts existence
    expect(fs.existsSync(batchBenchPath)).toBe(true);
    expect(fs.existsSync(dataloaderBenchPath)).toBe(true);
    expect(fs.existsSync(prepBenchPath)).toBe(true);
    expect(fs.existsSync(ckptBenchPath)).toBe(true);
    expect(fs.existsSync(recCfgPath)).toBe(true);

    // 2. Batch Benchmark Validation & OOM/Paging Guard
    const batchBench = JSON.parse(fs.readFileSync(batchBenchPath, 'utf8'));
    expect(batchBench.length).toBe(4);
    const b1 = batchBench.find((b: any) => b.batch_size === 1);
    const b2 = batchBench.find((b: any) => b.batch_size === 2);
    const b4 = batchBench.find((b: any) => b.batch_size === 4);
    const b8 = batchBench.find((b: any) => b.batch_size === 8);

    expect(b1).toBeDefined();
    expect(b1.peak_gpu_memory_mb).toBeLessThan(3500); // Safely fits in 4096MB
    expect(b1.oom).toBe(false);

    expect(b4).toBeDefined();
    expect(b4.peak_gpu_memory_mb).toBeGreaterThan(4096); // Verifies memory overflow detection into system RAM

    // 3. Recommended Configuration Parsing
    const recCfg = JSON.parse(fs.readFileSync(recCfgPath, 'utf8'));
    expect(recCfg.recommended_batch_size).toBe(1);
    expect(recCfg.recommended_gradient_accumulation_steps).toBe(16);
    expect(recCfg.effective_batch_size).toBe(16);
    expect(recCfg.recommended_num_workers).toBe(0); // Synchronous is fastest on Windows
    expect(recCfg.use_preprocessing_cache).toBe(true);
    expect(recCfg.fits_gtx_1650_4gb).toBe(true);

    // 4. DataLoader Workers Benchmark Validation
    const dlBench = JSON.parse(fs.readFileSync(dataloaderBenchPath, 'utf8'));
    expect(dlBench.length).toBe(3);
    const w0 = dlBench.find((w: any) => w.num_workers === 0);
    const w2 = dlBench.find((w: any) => w.num_workers === 2);
    const w4 = dlBench.find((w: any) => w.num_workers === 4);
    expect(w0.total_time_sec).toBeLessThan(w2.total_time_sec);
    expect(w0.total_time_sec).toBeLessThan(w4.total_time_sec);

    // 5. Preprocessing Cache Benchmark Validation
    const prepBench = JSON.parse(fs.readFileSync(prepBenchPath, 'utf8'));
    expect(prepBench.is_gradient_cached).toBe(false);
    expect(prepBench.is_embedding_cached).toBe(false);
    expect(prepBench.is_model_output_cached).toBe(false);
    expect(prepBench.cache_on_ms_per_sample).toBeLessThan(prepBench.cache_off_ms_per_sample);
    expect(prepBench.preprocessing_speedup_factor).toBeGreaterThan(1.0);

    // 6. Checkpoint Serialization & Parameter Guard
    const ckptBench = JSON.parse(fs.readFileSync(ckptBenchPath, 'utf8'));
    expect(ckptBench.size_mb).toBeLessThan(50);
    expect(ckptBench.size_under_50mb_guard).toBe(true);
    expect(ckptBench.lora_tensors).toBe(108);
    expect(ckptBench.lora_parameters).toBe(995328);
    expect(ckptBench.heads_tensors).toBe(18);
    expect(ckptBench.heads_parameters).toBe(310586);
    expect(ckptBench.frozen_backbone_parameters_saved).toBe(0);

    // 7. Micro Sanity Training Telemetry & Heartbeat Validation
    expect(fs.existsSync(sanityHeartbeatPath)).toBe(true);
    expect(fs.existsSync(sanityCkptPath)).toBe(true);
    const sanityHb = JSON.parse(fs.readFileSync(sanityHeartbeatPath, 'utf8'));
    expect(sanityHb.experiment_id).toBe('EXP-0015-PERFORMANCE-SANITY');
    expect(sanityHb.epoch).toBe(2);
    expect(sanityHb.total_epochs).toBe(2);
    expect(sanityHb.optimizer_steps_cumulative).toBe(2);
    expect(sanityHb.epoch_duration_seconds).toBeGreaterThan(0);
    expect(sanityHb.samples_per_second).toBeGreaterThan(0);
    expect(sanityHb.gpu_allocated_mb).toBeLessThan(2000);

    // Sanity checkpoint size guard
    const sanityStats = fs.statSync(sanityCkptPath);
    const sanitySizeMb = sanityStats.size / (1024 * 1024);
    expect(sanitySizeMb).toBeLessThan(50);
  });

  it('verifies Phase 13D.2 Selective-Layer LoRA Performance, Parameter Scaling, and Checkpoint Guards', () => {
    const forensicsDir = path.resolve(__dirname, '../training/runs/garment-exp-0015/forensics/selective_lora');
    const layerBenchPath = path.join(forensicsDir, 'layer_benchmark.json');
    const paramCompPath = path.join(forensicsDir, 'parameter_comparison.json');
    const memCompPath = path.join(forensicsDir, 'memory_comparison.json');
    const thruCompPath = path.join(forensicsDir, 'throughput_comparison.json');
    const recCfgPath = path.join(forensicsDir, 'recommended_configuration.json');

    // 1. Artifacts existence
    expect(fs.existsSync(layerBenchPath)).toBe(true);
    expect(fs.existsSync(paramCompPath)).toBe(true);
    expect(fs.existsSync(memCompPath)).toBe(true);
    expect(fs.existsSync(thruCompPath)).toBe(true);
    expect(fs.existsSync(recCfgPath)).toBe(true);

    // 2. Exact Parameter Counts & Scaling
    const paramList = JSON.parse(fs.readFileSync(paramCompPath, 'utf8'));
    const paramComp = Object.fromEntries(paramList.map((x: any) => [x.config_id, x]));
    // SigLIP SO400M has 27 layers (0 to 26), 1152 hidden dim.
    // LoRA rank 8 on q_proj and v_proj: 2 * (1152*8 + 8*1152) = 36,864 params/layer.
    expect(paramComp.CONFIG_A.adapted_layers).toBe(4);
    expect(paramComp.CONFIG_A.lora_parameters).toBe(147456);
    expect(paramComp.CONFIG_A.head_parameters).toBe(310586);
    expect(paramComp.CONFIG_A.total_trainable_parameters).toBe(458042);
    expect(paramComp.CONFIG_A.trainable_percentage).toBeCloseTo(0.1066, 3);

    expect(paramComp.CONFIG_B.adapted_layers).toBe(8);
    expect(paramComp.CONFIG_B.lora_parameters).toBe(294912);
    expect(paramComp.CONFIG_B.total_trainable_parameters).toBe(605498);

    expect(paramComp.CONFIG_C.adapted_layers).toBe(12);
    expect(paramComp.CONFIG_C.lora_parameters).toBe(442368);
    expect(paramComp.CONFIG_C.total_trainable_parameters).toBe(752954);

    expect(paramComp.CONFIG_D.adapted_layers).toBe(27);
    expect(paramComp.CONFIG_D.lora_parameters).toBe(995328);
    expect(paramComp.CONFIG_D.total_trainable_parameters).toBe(1305914);

    // 3. Layer Targeting & Excluded Layers Frozen
    expect(paramComp.CONFIG_A.layer_indices).toEqual([23, 24, 25, 26]);
    expect(paramComp.CONFIG_B.layer_indices).toEqual([19, 20, 21, 22, 23, 24, 25, 26]);
    expect(paramComp.CONFIG_C.layer_indices).toEqual([15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]);
    expect(paramComp.CONFIG_D.layer_indices.length).toBe(27);

    // 4. Measured Throughput & Speedup
    const thruList = JSON.parse(fs.readFileSync(thruCompPath, 'utf8'));
    const thruComp = Object.fromEntries(thruList.map((x: any) => [x.config_id, x]));
    expect(thruComp.CONFIG_A.samples_per_second).toBeGreaterThan(thruComp.CONFIG_D.samples_per_second);
    expect(thruComp.CONFIG_A.speedup_vs_full_27).toBeGreaterThan(1.5);

    // 5. Memory Safety & Paging Guard
    const memList = JSON.parse(fs.readFileSync(memCompPath, 'utf8'));
    const memComp = Object.fromEntries(memList.map((x: any) => [x.config_id, x]));
    expect(memComp.CONFIG_A.peak_vram_mb).toBeLessThan(2500);
    expect(memComp.CONFIG_A.safe_for_gtx_1650_4gb).toBe(true);

    // 6. Recommended Decision
    const recCfg = JSON.parse(fs.readFileSync(recCfgPath, 'utf8'));
    expect(recCfg.decision).toBe('SELECTIVE_LORA_4');
    expect(recCfg.num_layers).toBe(4);
    expect(recCfg.estimated_50_epoch_hours).toBeLessThan(20.0);

    // 7. Sanity Run Verification & Heartbeat / Checkpoint Guard
    const sanityResultPath = path.join(forensicsDir, 'sanity_result.json');
    expect(fs.existsSync(sanityResultPath)).toBe(true);
    const sanityResult = JSON.parse(fs.readFileSync(sanityResultPath, 'utf8'));
    expect(sanityResult.status).toBe('PASS');
    expect(sanityResult.training_execution.epochs_completed).toBe(2);
    expect(sanityResult.training_execution.optimizer_steps).toBe(2);
    expect(sanityResult.training_execution.weight_delta_verified).toBe(true);
    expect(sanityResult.checkpoint_verification.size_under_50mb_guard).toBe(true);
    expect(sanityResult.checkpoint_verification.checkpoint_size_mb).toBeLessThan(10);
    expect(sanityResult.checkpoint_verification.lora_tensors_saved).toBe(16);
    expect(sanityResult.checkpoint_verification.frozen_backbone_parameters_saved).toBe(0);
    expect(sanityResult.heartbeat_verification.all_fields_present).toBe(true);
  });

  it('verifies Phase 13D.3 Exp-0015 Selective LoRA Production Training, Evaluation, and Forensics', () => {
    const runDir = path.resolve(__dirname, '../training/runs/garment-exp-0015');
    const forensicsDir = path.join(runDir, 'forensics');
    const evalDir = path.join(runDir, 'evaluations');
    const ckptPath = path.join(runDir, 'checkpoint/best_model.pt');
    const envPath = path.join(runDir, 'environment.json');
    const heartbeatPath = path.join(runDir, 'training_heartbeat.json');
    const driftPath = path.join(forensicsDir, 'representation_drift.json');
    const evalSummaryPath = path.join(evalDir, 'multi_split_summary.json');
    const forensicAuditPath = path.join(forensicsDir, 'forensic_verification_13d_selective.json');

    // 1. Production Artifacts Existence
    expect(fs.existsSync(ckptPath)).toBe(true);
    expect(fs.existsSync(envPath)).toBe(true);
    expect(fs.existsSync(heartbeatPath)).toBe(true);
    expect(fs.existsSync(driftPath)).toBe(true);
    expect(fs.existsSync(evalSummaryPath)).toBe(true);
    expect(fs.existsSync(forensicAuditPath)).toBe(true);

    // 2. Checkpoint Hardening Guard
    const stats = fs.statSync(ckptPath);
    const sizeMb = stats.size / (1024 * 1024);
    expect(sizeMb).toBeLessThan(50); // Under 50MB guard
    expect(sizeMb).toBeGreaterThan(1); // Real weights saved

    // 3. Environment & Optimizer Accumulation Math
    const env = JSON.parse(fs.readFileSync(envPath, 'utf8'));
    expect(env.trainable_backbone_parameters).toBe(147456); // 4 layers * 36,864
    expect(env.trainable_head_parameters).toBe(310586);
    expect(env.trainable_parameters).toBe(458042);
    expect(env.total_optimizer_steps).toBe(232); // 8 epochs * 29 steps/epoch
    expect(env.best_epoch).toBe(2);
    expect(env.best_validation_macro_f1).toBeGreaterThan(0.47);

    // 4. Representation Drift Stability
    const drift = JSON.parse(fs.readFileSync(driftPath, 'utf8'));
    expect(drift.mean_cosine_similarity).toBeGreaterThan(0.99);
    expect(drift.representation_collapse).toBe(false);

    // 5. Multi-Split Evaluation Metrics
    const evalSummary = JSON.parse(fs.readFileSync(evalSummaryPath, 'utf8'));
    expect(evalSummary.real_world_test_full.metrics.category_top1_accuracy).toBe(0.375); // 37.5% (+25% gain over Exp-0014)
    expect(evalSummary.real_world_test_full.metrics.false_confidence_rate).toBe(0.0);
    expect(evalSummary.blind_test.metrics.category_top1_accuracy).toBe(0.25);
    expect(evalSummary.train.metrics.macro_f1).toBeGreaterThan(0.70);

    // 6. Forensic Verification Status
    const audit = JSON.parse(fs.readFileSync(forensicAuditPath, 'utf8'));
    expect(audit.status).toBe('PASS');
    expect(audit.checks.checkpoint.zero_base_backbone_leaked).toBe(true);
    expect(audit.checks.checkpoint.lora_tensors).toBe(16);
    expect(audit.checks.scientific_integrity.zero_commercial_apis).toBe(true);
  });

  describe('Phase 14 — Garment Localization + Selective LoRA System Experiment (garment-exp-0016)', () => {
    const exp16Dir = path.resolve(__dirname, '../training/runs/garment-exp-0016');
    const ckptPath = path.join(exp16Dir, 'checkpoint', 'best_model.pt');
    const envPath = path.join(exp16Dir, 'environment.json');
    const cfgPath = path.join(exp16Dir, 'config.json');
    const evalDir = path.join(exp16Dir, 'evaluations');
    const evalSummaryPath = path.join(evalDir, 'multi_split_summary.json');
    const forensicsDir = path.join(exp16Dir, 'forensics');
    const auditPath = path.join(forensicsDir, 'forensic_verification_14.json');
    const locForensicsPath = path.join(forensicsDir, 'localization_forensics.json');
    const driftPath = path.join(forensicsDir, 'representation_drift.json');

    it('validates invalid bbox handling and coordinate clamping in localization service', () => {
      // 1. Negative out-of-bounds coordinates
      const boxNegative = { x: -0.2, y: -0.5, width: 0.8, height: 0.8 };
      const clampedNeg = garmentLocalizationService.clampBoundingBox(boxNegative);
      expect(clampedNeg.x).toBe(0);
      expect(clampedNeg.y).toBe(0);
      expect(clampedNeg.width).toBeLessThanOrEqual(1.0);
      expect(clampedNeg.height).toBeLessThanOrEqual(1.0);

      // 2. Beyond unity coordinates
      const boxExcess = { x: 0.8, y: 0.9, width: 0.5, height: 0.6 };
      const clampedExcess = garmentLocalizationService.clampBoundingBox(boxExcess);
      expect(clampedExcess.x).toBe(0.8);
      expect(clampedExcess.y).toBe(0.9);
      expect(clampedExcess.x + clampedExcess.width).toBeLessThanOrEqual(1.0001);
      expect(clampedExcess.y + clampedExcess.height).toBeLessThanOrEqual(1.0001);

      // 3. Minimum width/height guards
      const boxZero = { x: 0.5, y: 0.5, width: -0.1, height: 0 };
      const clampedZero = garmentLocalizationService.clampBoundingBox(boxZero);
      expect(clampedZero.width).toBeGreaterThanOrEqual(0.01);
      expect(clampedZero.height).toBeGreaterThanOrEqual(0.01);
    });

    it('proposes multiple candidate garments with category hints and IoU computation', async () => {
      const proposals = await garmentLocalizationService.localizeGarments('file:///test_image.jpg', {
        maxProposals: 4,
        minConfidence: 0.5,
      });
      expect(proposals.length).toBeGreaterThanOrEqual(2);
      expect(proposals.length).toBeLessThanOrEqual(4);

      const hints = proposals.map((p) => p.category_hint);
      expect(hints).toContain('tops_or_outerwear');
      expect(hints).toContain('bottoms');

      // IoU calculation sanity
      const box1 = { x: 0.1, y: 0.1, width: 0.5, height: 0.5 };
      const box2 = { x: 0.1, y: 0.1, width: 0.5, height: 0.5 };
      expect(HeuristicGarmentLocalizationService.computeIoU(box1, box2)).toBeCloseTo(1.0, 4);

      const boxDisjoint = { x: 0.7, y: 0.7, width: 0.2, height: 0.2 };
      expect(HeuristicGarmentLocalizationService.computeIoU(box1, boxDisjoint)).toBe(0);
    });

    it('verifies selective LoRA layer targeting and parameter isolation', () => {
      expect(fs.existsSync(cfgPath)).toBe(true);
      expect(fs.existsSync(envPath)).toBe(true);

      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      const env = JSON.parse(fs.readFileSync(envPath, 'utf8'));

      expect(cfg.model.lora_num_layers).toBe(4);
      expect(cfg.model.lora_target_modules).toEqual(['q_proj', 'v_proj']);
      expect(cfg.model.lora_rank).toBe(8);
      expect(cfg.model.lora_alpha).toBe(16.0);

      // Only last 4 layers trainable: 4 layers * 2 matrices * (1152*8 + 8*1152) = 147,456
      expect(env.trainable_backbone_parameters).toBe(147456);
      expect(env.trainable_head_parameters).toBe(310586);
      expect(env.trainable_parameters).toBe(458042);
      expect(env.total_optimizer_steps).toBe(232);
    });

    it('verifies adapter-only checkpoint serialization under 50 MB guard with 0 frozen parameters', () => {
      expect(fs.existsSync(ckptPath)).toBe(true);
      const stat = fs.statSync(ckptPath);
      const sizeMb = stat.size / (1024 * 1024);

      expect(sizeMb).toBeLessThan(50); // Hard enforcement < 50MB
      expect(sizeMb).toBeGreaterThan(1); // Real weights saved (~5.28 MB)

      const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      expect(audit.checks.checkpoint.zero_base_backbone_leaked).toBe(true);
      expect(audit.checks.checkpoint.lora_tensors).toBe(16);
      expect(audit.checks.checkpoint.heads_tensors).toBe(18);
    });

    it('verifies dataset immutability and blind test protection', () => {
      const dataset500Path = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.5-500.json');
      const blindPath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.3-blind-freeze.json');

      const hash500 = crypto.createHash('sha256').update(fs.readFileSync(dataset500Path)).digest('hex');
      expect(hash500).toBe('85375f147608616762636106bd433a2378af902925161d260365e344f2a0fe1e');

      const hashBlind = crypto.createHash('sha256').update(fs.readFileSync(blindPath)).digest('hex');
      expect(hashBlind).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');

      const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      expect(audit.checks.dataset_immutability.dataset_500_verified).toBe(true);
      expect(audit.checks.dataset_immutability.blind_freeze_verified).toBe(true);
    });

    it('verifies localized crop inference, four-cell comparison, and confidence accounting', () => {
      expect(fs.existsSync(evalSummaryPath)).toBe(true);
      expect(fs.existsSync(locForensicsPath)).toBe(true);
      expect(fs.existsSync(driftPath)).toBe(true);

      const summary = JSON.parse(fs.readFileSync(evalSummaryPath, 'utf8'));
      const locForensics = JSON.parse(fs.readFileSync(locForensicsPath, 'utf8'));
      const drift = JSON.parse(fs.readFileSync(driftPath, 'utf8'));

      // Four-cell results verified
      const oracle = summary.real_world_test_oracle_crop.metrics;
      const autoCrop = summary.real_world_test_auto_crop.metrics;
      const full = summary.real_world_test_full.metrics;

      // Real-world category accuracy: oracle crop (31.25%), auto crop (25.00%), full (37.50%)
      expect(oracle.category_top1_accuracy).toBe(0.3125);
      expect(autoCrop.category_top1_accuracy).toBe(0.25);
      expect(full.category_top1_accuracy).toBe(0.375);

      // Fine-grained macro F1 recovery: Oracle Crop (16.67%) vs Full (13.54%)
      expect(oracle.macro_f1).toBeCloseTo(0.1667, 4);
      expect(full.macro_f1).toBeCloseTo(0.1354, 4);
      expect(oracle.macro_f1).toBeGreaterThan(full.macro_f1);

      // Confidence accounting
      expect(oracle.accepted_count).toBe(2);
      expect(oracle.refusal_rate).toBe(0.875);
      expect(oracle.false_confidence_rate).toBe(0.0);

      // Localization performance metrics
      const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      expect(audit.checks.localization_benchmark.mean_iou).toBeGreaterThan(0.60);
      expect(audit.checks.localization_benchmark.recall_at_50).toBeGreaterThanOrEqual(0.85);
      expect(Array.isArray(locForensics)).toBe(true);
      expect(locForensics.length).toBe(16);
      expect(locForensics[0].image_id).toBe('garm_v3_151');
      expect(locForensics[0].full_image_prediction).toBeDefined();
      expect(locForensics[0].oracle_crop_prediction).toBeDefined();

      // Representation drift
      expect(drift.mean_cosine_similarity).toBeGreaterThan(0.99);
      expect(drift.real_world_full_vs_crop.mean_cosine).toBeLessThan(0.95);
      expect(drift.real_world_full_vs_crop.mean_cosine).toBeGreaterThan(0.85);
    });

    it('verifies forensic audit passes 100% of scientific and security checks', () => {
      const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      expect(audit.status).toBe('PASS');
      expect(audit.checks.scientific_integrity.zero_commercial_apis).toBe(true);
      expect(audit.checks.heartbeat.all_fields_present).toBe(true);
      expect(audit.checks.weight_delta.weight_delta_verified).toBe(true);
      expect(audit.checks.localization_forensics.all_samples_present).toBe(true);
    });
  });

  describe('Phase 14A — Localization Proposal Quality & Error Attribution Study', () => {
    const audit14aDir = path.resolve(__dirname, '../training/data-audits/phase14a');
    const attributionPath = path.join(audit14aDir, 'proposal_attribution.json');
    const topkPath = path.join(audit14aDir, 'topk_coverage.json');
    const paddingPath = path.join(audit14aDir, 'crop_padding_analysis.json');
    const rerankPath = path.join(audit14aDir, 'reranking_results.json');
    const latencyPath = path.join(audit14aDir, 'latency_benchmark.json');
    const modelOptionsPath = path.join(audit14aDir, 'local_model_options.json');
    const forensic14aPath = path.join(audit14aDir, 'forensic_verification_14a.json');
    const blindFreezePath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.3-blind-freeze.json');

    it('validates multi-proposal output generation and confidence filtering', async () => {
      const proposalsAll = await garmentLocalizationService.localizeGarments('file:///dummy.jpg', {
        maxProposals: 4,
        minConfidence: 0.5,
      });
      expect(proposalsAll.length).toBe(4);

      const hints = proposalsAll.map((p) => p.category_hint);
      expect(hints).toContain('tops_or_outerwear');
      expect(hints).toContain('bottoms');
      expect(hints).toContain('shoes');
      expect(hints).toContain('one_piece_or_full_outfit');

      // Filter with higher threshold
      const filtered = await garmentLocalizationService.localizeGarments('file:///dummy.jpg', {
        maxProposals: 2,
        minConfidence: 0.82,
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].category_hint).toBe('tops_or_outerwear');
    });

    it('validates bounding box validity, invalid region protection, and proportional padding', () => {
      // 1. Invalid / Out of bounds clamping
      const badBox = { x: -0.5, y: 1.5, width: 0.9, height: 0.8 };
      const clamped = garmentLocalizationService.clampBoundingBox(badBox);
      expect(clamped.x).toBe(0);
      expect(clamped.y).toBe(1.0);
      expect(clamped.width).toBeLessThanOrEqual(1.0);
      expect(clamped.height).toBeGreaterThanOrEqual(0.01);

      // 2. Degenerate zero-area box protection
      const zeroBox = { x: 0.2, y: 0.2, width: 0, height: -0.1 };
      const clampedZero = garmentLocalizationService.clampBoundingBox(zeroBox);
      expect(clampedZero.width).toBeGreaterThanOrEqual(0.01);
      expect(clampedZero.height).toBeGreaterThanOrEqual(0.01);

      // 3. Proportional padding
      const origBox = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
      const padded5 = garmentLocalizationService.applyPadding(origBox, 0.05);
      expect(padded5.width).toBeCloseTo(0.44, 4); // 0.4 + 2 * (0.4 * 0.05) = 0.44
      expect(padded5.height).toBeCloseTo(0.44, 4);
      expect(padded5.x).toBeCloseTo(0.18, 4); // 0.2 - 0.02 = 0.18
      expect(padded5.y).toBeCloseTo(0.18, 4);

      // 4. Boundary clamping with padding
      const borderBox = { x: 0.02, y: 0.02, width: 0.98, height: 0.98 };
      const paddedBorder = garmentLocalizationService.applyPadding(borderBox, 0.10);
      expect(paddedBorder.x).toBe(0);
      expect(paddedBorder.y).toBe(0);
      expect(paddedBorder.x + paddedBorder.width).toBeLessThanOrEqual(1.0001);
      expect(paddedBorder.y + paddedBorder.height).toBeLessThanOrEqual(1.0001);
    });

    it('verifies Top-K coverage progression and rank distribution across multi-garment outfits', () => {
      expect(fs.existsSync(topkPath)).toBe(true);
      const topk = JSON.parse(fs.readFileSync(topkPath, 'utf8'));

      expect(topk.coverage_by_k.top_1.coverage_iou_gte_0_50).toBe(0.4375);
      expect(topk.coverage_by_k.top_2.coverage_iou_gte_0_50).toBe(0.6875);
      expect(topk.coverage_by_k.top_3.coverage_iou_gte_0_50).toBe(0.8125);
      expect(topk.coverage_by_k.top_4.coverage_iou_gte_0_50).toBe(0.8125);

      // Best proposal distribution across ranks
      expect(topk.best_proposal_rank_distribution.rank_1).toBe(6);
      expect(topk.best_proposal_rank_distribution.rank_2).toBe(4);
      expect(topk.best_proposal_rank_distribution.rank_3).toBe(3);
      expect(topk.best_proposal_rank_distribution.rank_4).toBe(3);
    });

    it('verifies classifier-as-reranker results and crop padding findings', () => {
      expect(fs.existsSync(rerankPath)).toBe(true);
      expect(fs.existsSync(paddingPath)).toBe(true);

      const rerank = JSON.parse(fs.readFileSync(rerankPath, 'utf8'));
      const padding = JSON.parse(fs.readFileSync(paddingPath, 'utf8'));

      // Full image baseline remains superior to reranked crops
      expect(rerank.full_image_baseline.category_accuracy).toBe(0.375);
      expect(rerank.oracle_crop_upper_bound.category_accuracy).toBe(0.3125);
      expect(rerank.K_1.category_accuracy).toBe(0.3125);
      expect(rerank.K_2.category_accuracy).toBe(0.3125);
      expect(rerank.K_3.category_accuracy).toBe(0.25); // Reranking without detection awareness degrades accuracy

      // Padding findings
      expect(padding.oracle_crop.tight_accuracy).toBe(0.3125);
      expect(padding.auto_best_crop.tight_accuracy).toBe(0.3125);
    });

    it('verifies sample-level attribution metadata, error categories, and local model options', () => {
      expect(fs.existsSync(attributionPath)).toBe(true);
      expect(fs.existsSync(latencyPath)).toBe(true);
      expect(fs.existsSync(modelOptionsPath)).toBe(true);

      const attr = JSON.parse(fs.readFileSync(attributionPath, 'utf8'));
      const latency = JSON.parse(fs.readFileSync(latencyPath, 'utf8'));
      const models = JSON.parse(fs.readFileSync(modelOptionsPath, 'utf8'));

      expect(attr.total_samples).toBe(16);
      expect(attr.error_distribution.WRONG_GARMENT).toBe(5); // Dominant failure mode
      expect(attr.error_distribution.CORRECT_CROP_CLASSIFIER_FAILURE).toBe(3);
      expect(attr.error_distribution.LOCALIZATION_WRONG).toBe(1);

      // Latency benchmark
      expect(latency.heuristic_proposal_generation_ms).toBeLessThan(1.0);
      expect(latency.pipeline_latencies_ms.automated_k3_reranked).toBeGreaterThan(1000.0);

      // Permissive local detector options (RT-DETR, SegFormer-B0)
      const rtDetr = models.find((m: any) => m.model_name.includes('RT-DETR'));
      expect(rtDetr).toBeDefined();
      expect(rtDetr.license).toContain('Apache-2.0');
      expect(rtDetr.commercial_use_status).toBe('PERMISSIVE_COMMERCIAL_APPROVED');
    });

    it('verifies forensic audit 14A and strict frozen blind test immutability', () => {
      expect(fs.existsSync(forensic14aPath)).toBe(true);
      const forensic = JSON.parse(fs.readFileSync(forensic14aPath, 'utf8'));

      expect(forensic.status).toBe('PASS');
      expect(forensic.checks.dataset_immutability.blind_freeze_verified).toBe(true);
      expect(forensic.checks.dataset_immutability.dataset_500_verified).toBe(true);
      expect(forensic.checks.checkpoint_integrity.checkpoint_verified).toBe(true);
      expect(forensic.checks.scientific_integrity.zero_commercial_apis).toBe(true);

      // Verify blind hash directly
      const hashBlind = crypto.createHash('sha256').update(fs.readFileSync(blindFreezePath)).digest('hex');
      expect(hashBlind).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');
    });
  });
});







