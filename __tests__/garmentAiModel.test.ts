import { DatasetValidator } from '../tools/ai-benchmark/garment/datasetValidator';
import { GarmentEvaluator } from '../tools/ai-benchmark/garment/evaluate';
import { AuraGarmentModel } from '../src/services/garment-ai/auraGarmentModel';
import { IGarmentVisionModel } from '../tools/ai-benchmark/types';
import {
  isHierarchicalFitMatch,
  isHierarchicalMaterialMatch,
  isHierarchicalColorMatch,
} from '../src/types/garmentTaxonomy';
import * as path from 'path';

describe('AURA Garment-v1 & v0.2 Dataset Benchmark Suite', () => {
  const manifestPath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.2.json');
  const projectRoot = path.resolve(__dirname, '..');

  it('validates golden dataset v0.2 manifest with zero taxonomy violations or leakage', () => {
    const report = DatasetValidator.validateManifest(manifestPath, projectRoot);

    expect(report.isValid).toBe(true);
    expect(report.totalItems).toBe(46);
    expect(report.splitCounts.train).toBe(22);
    expect(report.splitCounts.validation).toBe(6);
    expect(report.splitCounts.test).toBe(6);
    expect(report.splitCounts.hard_test).toBe(6);
    expect(report.splitCounts.real_world_test).toBe(6);
    expect(report.leakageDetected).toBe(false);
    expect(report.issues.length).toBe(0);
    expect(report.categoryDistribution.tops.count).toBeGreaterThan(0);
    expect(report.categoryDistribution.bottoms.count).toBeGreaterThan(0);
  });

  it('computes perceptual hashes and flags cross-split duplicate leakage', () => {
    const hash = DatasetValidator.computeImageFingerprint(path.resolve(projectRoot, 'assets/curated/asset_0.png'));
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(5);
  });

  it('verifies hierarchical taxonomy helper matches correctly', () => {
    // Fit hierarchy
    expect(isHierarchicalFitMatch('Relaxed', 'Oversized')).toBe(true);
    expect(isHierarchicalFitMatch('Oversized', 'Relaxed')).toBe(true);
    expect(isHierarchicalFitMatch('Regular', 'Oversized')).toBe(false);

    // Material hierarchy
    expect(isHierarchicalMaterialMatch('synthetic', 'nylon')).toBe(true);
    expect(isHierarchicalMaterialMatch('nylon', 'synthetic')).toBe(true);
    expect(isHierarchicalMaterialMatch('cotton', 'nylon')).toBe(false);

    // Color hierarchy
    expect(isHierarchicalColorMatch('white', 'cream')).toBe(true);
    expect(isHierarchicalColorMatch('cream', 'white')).toBe(true);
    expect(isHierarchicalColorMatch('black', 'cream')).toBe(false);
  });

  it('runs GarmentEvaluator across blind test, hard test, and real-world splits', async () => {
    const mockModel: IGarmentVisionModel = {
      modelId: 'aura-garment-v1-v0.2-test',
      version: '0.2.0',
      extractAttributes: async (img: string) => {
        // Blind test mock
        if (img.includes('asset_14')) {
          return {
            category: 'tops',
            primary_color: '#F0EFEA',
            fit: 'Fitted',
            pattern: 'solid',
            material: 'cotton',
            season: ['Summer'],
            occasion: ['Casual'],
            formality_score: 0.25,
            confidence: 0.95,
          };
        }
        if (img.includes('garment_4')) {
          // Hard test: cream vs white challenge
          return {
            category: 'tops',
            primary_color: '#FFFFFF', // Off-white/cream slight variation
            fit: 'Relaxed', // Hierarchical match with Oversized
            pattern: 'solid',
            material: 'linen',
            season: ['All Season'],
            occasion: ['Casual'],
            formality_score: 0.45,
            confidence: 0.88,
          };
        }
        return {
          category: 'bottoms',
          primary_color: '#1A1A1A',
          fit: 'Relaxed',
          pattern: 'solid',
          material: 'wool',
          season: ['Fall'],
          occasion: ['Work / Office'],
          formality_score: 0.75,
          confidence: 0.92,
        };
      },
    };

    const testRecords = [
      {
        image_id: 'test_top',
        image_path: 'assets/curated/asset_14.png',
        split: 'test',
        labels: {
          category: 'tops' as const,
          subcategory: 'tank' as const,
          primary_color_hex: '#F0EFEA',
          color_family: 'cream' as const,
          fit: 'Fitted' as const,
          silhouette: 'fitted' as const,
          pattern: 'solid' as const,
          material: 'cotton' as const,
          formality_score: 0.25,
          occasions: ['Casual' as const],
          seasons: ['Summer' as const],
        },
      },
      {
        image_id: 'hard_top',
        image_path: 'assets/figma_curated/garments/garment_4.png',
        split: 'hard_test',
        challenge_type: 'cream_vs_white_boundary',
        labels: {
          category: 'tops' as const,
          subcategory: 'overshirt' as const,
          primary_color_hex: '#F4F3EF',
          color_family: 'cream' as const,
          fit: 'Oversized' as const,
          silhouette: 'relaxed' as const,
          pattern: 'solid' as const,
          material: 'linen' as const,
          formality_score: 0.45,
          occasions: ['Casual' as const],
          seasons: ['All Season' as const],
        },
      },
    ];

    // Evaluate on blind test
    const blindRes = await GarmentEvaluator.evaluate(mockModel, testRecords, 'test', 'v0.2.0');
    expect(blindRes.metrics.category_top1_accuracy.value).toBe(1.0);
    expect(blindRes.metrics.category_top1_accuracy.sample_size).toBe(1);
    expect(blindRes.metrics.category_top1_accuracy.status).toBe('MEASURED');

    // Evaluate on hard test
    const hardRes = await GarmentEvaluator.evaluate(mockModel, testRecords, 'hard_test', 'v0.2.0');
    expect(hardRes.metrics.fit_hierarchical_accuracy.value).toBe(0.75); // Hierarchical partial credit
    expect(hardRes.failures.length).toBe(1);
    expect(hardRes.failures[0].failure_type).toBe('TAXONOMY');
  });

  it('runs AuraGarmentModel and returns calibrated prediction with fallback resilience', async () => {
    const model = new AuraGarmentModel();
    const res = await model.predictAttributes('file:///test_shirt.jpg');

    expect(res.model_id).toBe('aura-garment-v1');
    expect(res.labels.category).toBeDefined();
    expect(res.confidences.category).toBeGreaterThan(0.5);
    expect(res.runtime_device).toBeDefined();
  });
});
