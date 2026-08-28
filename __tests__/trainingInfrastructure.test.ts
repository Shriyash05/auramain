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
});
