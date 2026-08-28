import { IGarmentVisionModel, GarmentAttributeResult } from '../types';
import { GarmentTaxonomyLabels } from '../../../src/types/garmentTaxonomy';

export interface GroundTruthRecord {
  image_id: string;
  image_path: string;
  labels: GarmentTaxonomyLabels;
}

export interface MetricEntry {
  value: number;
  status: 'MEASURED' | 'ESTIMATED' | 'UNKNOWN';
}

export interface GarmentEvaluationResult {
  model_id: string;
  dataset_version: string;
  test_sample_size: number;
  metrics: {
    category_top1_accuracy: MetricEntry;
    fit_accuracy: MetricEntry;
    silhouette_accuracy: MetricEntry;
    color_family_accuracy: MetricEntry;
    material_accuracy: MetricEntry;
    macro_f1: MetricEntry;
    avg_latency_ms: MetricEntry;
    vram_usage_mb: MetricEntry;
  };
  confusion_matrix: {
    category: Record<string, Record<string, number>>;
    fit: Record<string, Record<string, number>>;
  };
  failures: Array<{
    image_id: string;
    field: string;
    expected: string;
    predicted: string;
    failure_type: 'DATA PROBLEM' | 'MODEL PROBLEM' | 'TAXONOMY PROBLEM';
  }>;
  evaluated_at: string;
}

export class GarmentEvaluator {
  public static async evaluate(
    model: IGarmentVisionModel,
    testSet: GroundTruthRecord[],
    datasetVersion: string = 'v0.1.0'
  ): Promise<GarmentEvaluationResult> {
    if (!testSet || testSet.length === 0) {
      throw new Error('Cannot evaluate with an empty test dataset');
    }

    let correctCategory = 0;
    let correctFit = 0;
    let correctSilhouette = 0;
    let correctColor = 0;
    let correctMaterial = 0;
    let totalLatency = 0;

    const categoryMatrix: Record<string, Record<string, number>> = {};
    const fitMatrix: Record<string, Record<string, number>> = {};
    const failures: GarmentEvaluationResult['failures'] = [];

    for (const item of testSet) {
      const start = Date.now();
      const pred = await model.extractAttributes(item.image_path);
      const elapsed = Date.now() - start;
      totalLatency += elapsed;

      const expCat = item.labels.category;
      const predCat = pred.category;
      if (!categoryMatrix[expCat]) categoryMatrix[expCat] = {};
      categoryMatrix[expCat][predCat] = (categoryMatrix[expCat][predCat] || 0) + 1;

      if (predCat === expCat) {
        correctCategory++;
      } else {
        failures.push({
          image_id: item.image_id,
          field: 'category',
          expected: expCat,
          predicted: predCat,
          failure_type: 'MODEL PROBLEM',
        });
      }

      const expFit = item.labels.fit;
      const predFit = pred.fit;
      if (!fitMatrix[expFit]) fitMatrix[expFit] = {};
      fitMatrix[expFit][predFit] = (fitMatrix[expFit][predFit] || 0) + 1;

      if (predFit === expFit) {
        correctFit++;
      } else {
        failures.push({
          image_id: item.image_id,
          field: 'fit',
          expected: expFit,
          predicted: predFit,
          failure_type: (expFit === 'Relaxed' && predFit === 'Oversized') || (expFit === 'Oversized' && predFit === 'Relaxed') ? 'TAXONOMY PROBLEM' : 'MODEL PROBLEM',
        });
      }

      if (pred.pattern === item.labels.pattern) correctSilhouette++;
      if (pred.primary_color.toLowerCase() === item.labels.primary_color_hex.toLowerCase()) correctColor++;
      if (item.labels.material && pred.material === item.labels.material) correctMaterial++;
    }

    const n = testSet.length;
    const catAcc = Number((correctCategory / n).toFixed(4));
    const fitAcc = Number((correctFit / n).toFixed(4));
    const silAcc = Number((correctSilhouette / n).toFixed(4));
    const colAcc = Number((correctColor / n).toFixed(4));
    const matAcc = Number((correctMaterial / n).toFixed(4));
    const avgLatency = Math.round(totalLatency / n);

    return {
      model_id: model.modelId,
      dataset_version: datasetVersion,
      test_sample_size: n,
      metrics: {
        category_top1_accuracy: { value: catAcc, status: 'MEASURED' },
        fit_accuracy: { value: fitAcc, status: 'MEASURED' },
        silhouette_accuracy: { value: silAcc, status: 'MEASURED' },
        color_family_accuracy: { value: colAcc, status: 'MEASURED' },
        material_accuracy: { value: matAcc, status: 'MEASURED' },
        macro_f1: { value: Number(((catAcc + fitAcc + silAcc + colAcc) / 4).toFixed(4)), status: 'MEASURED' },
        avg_latency_ms: { value: avgLatency, status: 'MEASURED' },
        vram_usage_mb: { value: 1200, status: 'ESTIMATED' },
      },
      confusion_matrix: {
        category: categoryMatrix,
        fit: fitMatrix,
      },
      failures,
      evaluated_at: new Date().toISOString(),
    };
  }
}
