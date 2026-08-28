import * as fs from 'fs';
import * as path from 'path';
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
});

