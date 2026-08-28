import { DatasetValidator } from '../tools/ai-benchmark/garment/datasetValidator';
import { GarmentEvaluator } from '../tools/ai-benchmark/garment/evaluate';
import { GarmentReviewTool } from '../tools/ai-benchmark/garment/reviewTool';
import { AuraGarmentModel } from '../src/services/garment-ai/auraGarmentModel';
import { IGarmentVisionModel } from '../tools/ai-benchmark/types';
import {
  isHierarchicalFitMatch,
  isHierarchicalMaterialMatch,
  isHierarchicalColorMatch,
  isDualCategoryMatch,
} from '../src/types/garmentTaxonomy';
import * as path from 'path';

describe('AURA Garment-v1 & v0.3 Dataset Benchmark Suite', () => {
  const manifestPath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.3.json');
  const freezeManifestPath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.3-blind-freeze.json');
  const projectRoot = path.resolve(__dirname, '..');

  it('validates golden dataset v0.3 manifest with 166 verified physical assets and zero leakage', () => {
    const report = DatasetValidator.validateManifest(manifestPath, projectRoot);

    expect(report.isValid).toBe(true);
    expect(report.totalItems).toBe(166);
    expect(report.splitCounts.train).toBe(92);
    expect(report.splitCounts.validation).toBe(20);
    expect(report.splitCounts.blind_test).toBe(20);
    expect(report.splitCounts.hard_test).toBe(18);
    expect(report.splitCounts.real_world_test).toBe(16);
    expect(report.leakageDetected).toBe(false);
    expect(report.groupedLeakageDetected).toBe(false);
    expect(report.issues.length).toBe(0);
    expect(report.categoryDistribution.tops.count).toBeGreaterThan(0);
    expect(report.categoryDistribution.bottoms.count).toBeGreaterThan(0);
  });

  it('verifies frozen blind test manifest integrity', () => {
    const report = DatasetValidator.validateManifest(freezeManifestPath, projectRoot);
    expect(report.totalItems).toBe(20);
    expect(report.isValid).toBe(true);
  });

  it('verifies hierarchical taxonomy & dual-category matching helpers', () => {
    // Fit hierarchy
    expect(isHierarchicalFitMatch('Relaxed', 'Oversized')).toBe(true);
    expect(isHierarchicalFitMatch('Oversized', 'Relaxed')).toBe(true);
    expect(isHierarchicalFitMatch('Regular', 'Oversized')).toBe(false);

    // Material hierarchy
    expect(isHierarchicalMaterialMatch('synthetic', 'nylon')).toBe(true);
    expect(isHierarchicalMaterialMatch('nylon', 'synthetic')).toBe(true);

    // Color hierarchy
    expect(isHierarchicalColorMatch('white', 'cream')).toBe(true);
    expect(isHierarchicalColorMatch('cream', 'white')).toBe(true);

    // Dual-category matching for overshirts
    expect(isDualCategoryMatch('tops', 'tops', 'outerwear')).toBe(true);
    expect(isDualCategoryMatch('outerwear', 'tops', 'outerwear')).toBe(true);
    expect(isDualCategoryMatch('shoes', 'tops', 'outerwear')).toBe(false);
  });

  it('enqueues and processes items in GarmentReviewTool', () => {
    const item = GarmentReviewTool.enqueueForReview(
      'garm_rev_01',
      'assets/figma_images/sample.png',
      {
        category: 'tops',
        subcategory: 'overshirt',
        primary_color_hex: '#F0EFEA',
        color_family: 'cream',
        fit: 'Oversized',
        silhouette: 'relaxed',
        pattern: 'solid',
        material: 'linen',
        formality_score: 0.45,
        occasions: ['Casual'],
        seasons: ['All Season'],
      },
      {
        model_id: 'aura-garment-v1',
        version: '0.3.0',
        labels: {
          category: 'outerwear',
          subcategory: 'overshirt',
          primary_color_hex: '#F0EFEA',
          color_family: 'cream',
          fit: 'Relaxed',
          silhouette: 'relaxed',
          pattern: 'solid',
          material: 'linen',
          formality_score: 0.5,
          occasions: ['Casual'],
          seasons: ['All Season'],
        },
        confidences: {
          category: 0.72,
          subcategory: 0.7,
          fit: 0.68,
          silhouette: 0.75,
          color_family: 0.9,
          pattern: 0.85,
          material: 0.8,
          formality: 0.8,
        },
        latency_ms: 110,
        runtime_device: 'gpu_serverless',
        calibrated: true,
      },
      'AMBIGUOUS',
      'Overshirt category boundary between tops and outerwear'
    );

    expect(item.review_id).toBeDefined();
    expect(item.classification).toBe('AMBIGUOUS');

    const pending = GarmentReviewTool.getPendingReviews();
    expect(pending.length).toBeGreaterThan(0);

    const success = GarmentReviewTool.submitReviewDecision(item.review_id, 'CORRECT', 'Confirmed dual-category match');
    expect(success).toBe(true);
  });

  it('runs GarmentEvaluator across blind test, hard test, and real-world splits', async () => {
    const mockModel: IGarmentVisionModel = {
      modelId: 'aura-garment-v1-v0.3-test',
      version: '0.3.0',
      extractAttributes: async (img: string) => {
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
        if (img.includes('hard')) {
          return {
            category: 'tops',
            primary_color: '#FFFFFF',
            fit: 'Relaxed',
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
        split: 'blind_test',
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
        image_path: 'assets/figma_images/hard_sample.png',
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

    const blindRes = await GarmentEvaluator.evaluate(mockModel, testRecords, 'blind_test', 'v0.3.0');
    expect(blindRes.metrics.category_top1_accuracy.value).toBe(1.0);
    expect(blindRes.metrics.category_top1_accuracy.sample_size).toBe(1);

    const hardRes = await GarmentEvaluator.evaluate(mockModel, testRecords, 'hard_test', 'v0.3.0');
    expect(hardRes.metrics.fit_hierarchical_accuracy.value).toBe(0.75);
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
