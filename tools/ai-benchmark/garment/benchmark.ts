import { IGarmentVisionModel, GarmentAttributeResult } from '../types';

export interface GarmentGroundTruthItem {
  id: string;
  imageUri: string;
  expectedCategory: 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories';
  expectedFit: 'Oversized' | 'Relaxed' | 'Regular' | 'Slim' | 'Fitted';
  expectedPrimaryColor: string;
  expectedFormalityRange: [number, number];
}

export interface GarmentBenchmarkReport {
  totalItems: number;
  categoryTop1Accuracy: number;
  fitAccuracy: number;
  avgLatencyMs: number;
  status: 'DATASET REQUIRED' | 'EVALUATION COMPLETE';
  evaluatedAt: string;
}

export class GarmentBenchmarkRunner {
  public static async runBenchmark(
    model: IGarmentVisionModel,
    dataset: GarmentGroundTruthItem[]
  ): Promise<GarmentBenchmarkReport> {
    if (!dataset || dataset.length === 0) {
      return {
        totalItems: 0,
        categoryTop1Accuracy: 0,
        fitAccuracy: 0,
        avgLatencyMs: 0,
        status: 'DATASET REQUIRED',
        evaluatedAt: new Date().toISOString(),
      };
    }

    let correctCategory = 0;
    let correctFit = 0;
    let totalLatency = 0;

    for (const item of dataset) {
      const startTime = Date.now();
      const pred = await model.extractAttributes(item.imageUri);
      const elapsed = Date.now() - startTime;
      totalLatency += elapsed;

      if (pred.category === item.expectedCategory) correctCategory++;
      if (pred.fit === item.expectedFit) correctFit++;
    }

    return {
      totalItems: dataset.length,
      categoryTop1Accuracy: Number((correctCategory / dataset.length).toFixed(4)),
      fitAccuracy: Number((correctFit / dataset.length).toFixed(4)),
      avgLatencyMs: Math.round(totalLatency / dataset.length),
      status: 'EVALUATION COMPLETE',
      evaluatedAt: new Date().toISOString(),
    };
  }
}
