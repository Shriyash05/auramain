import { DatasetValidator } from '../tools/ai-benchmark/garment/datasetValidator';
import { GarmentEvaluator } from '../tools/ai-benchmark/garment/evaluate';
import { AuraGarmentModel } from '../src/services/garment-ai/auraGarmentModel';
import { IGarmentVisionModel } from '../tools/ai-benchmark/types';
import * as path from 'path';

describe('AURA Garment-v1 Dataset, Validator & Model Suite', () => {
  const manifestPath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.1.json');
  const projectRoot = path.resolve(__dirname, '..');

  it('validates golden dataset manifest with zero taxonomy violations or leakage', () => {
    const report = DatasetValidator.validateManifest(manifestPath, projectRoot);

    expect(report.isValid).toBe(true);
    expect(report.totalItems).toBe(18);
    expect(report.trainCount).toBe(10);
    expect(report.valCount).toBe(4);
    expect(report.testCount).toBe(4);
    expect(report.leakageDetected).toBe(false);
    expect(report.issues.length).toBe(0);
  });

  it('runs GarmentEvaluator on test split and computes measured metrics', async () => {
    const mockModel: IGarmentVisionModel = {
      modelId: 'aura-garment-v1-test',
      version: '0.1.0',
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
        if (img.includes('asset_15')) {
          return {
            category: 'bottoms',
            primary_color: '#2B2C2E',
            fit: 'Relaxed', // Simulated slight taxonomy mismatch (Oversized -> Relaxed)
            pattern: 'solid',
            material: 'wool',
            season: ['Fall'],
            occasion: ['Work / Office'],
            formality_score: 0.7,
            confidence: 0.9,
          };
        }
        if (img.includes('asset_16')) {
          return {
            category: 'outerwear',
            primary_color: '#4A4C50',
            fit: 'Relaxed',
            pattern: 'solid',
            material: 'nylon',
            season: ['Fall'],
            occasion: ['Streetwear'],
            formality_score: 0.45,
            confidence: 0.9,
          };
        }
        return {
          category: 'shoes',
          primary_color: '#111111',
          fit: 'Regular',
          pattern: 'solid',
          material: 'leather',
          season: ['Fall'],
          occasion: ['Casual'],
          formality_score: 0.7,
          confidence: 0.95,
        };
      },
    };

    const testRecords = [
      {
        image_id: 'test_top',
        image_path: 'assets/curated/asset_14.png',
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
        image_id: 'test_bot',
        image_path: 'assets/curated/asset_15.png',
        labels: {
          category: 'bottoms' as const,
          subcategory: 'pleated_pants' as const,
          primary_color_hex: '#2B2C2E',
          color_family: 'grey' as const,
          fit: 'Oversized' as const,
          silhouette: 'wide' as const,
          pattern: 'solid' as const,
          material: 'wool' as const,
          formality_score: 0.7,
          occasions: ['Work / Office' as const],
          seasons: ['Fall' as const],
        },
      },
    ];

    const result = await GarmentEvaluator.evaluate(mockModel, testRecords, 'v0.1.0');

    expect(result.metrics.category_top1_accuracy.value).toBe(1.0);
    expect(result.metrics.category_top1_accuracy.status).toBe('MEASURED');
    expect(result.metrics.fit_accuracy.value).toBe(0.5);
    expect(result.failures.length).toBe(1);
    expect(result.failures[0].failure_type).toBe('TAXONOMY PROBLEM');
  });

  it('runs AuraGarmentModel and returns structured prediction with fallback support', async () => {
    const model = new AuraGarmentModel();
    const res = await model.predictAttributes('file:///test_shirt.jpg');

    expect(res.model_id).toBe('aura-garment-v1');
    expect(res.labels.category).toBeDefined();
    expect(res.confidences.category).toBeGreaterThan(0.5);
    expect(res.runtime_device).toBeDefined();
  });
});
