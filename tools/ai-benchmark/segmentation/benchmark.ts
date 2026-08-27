import { IGarmentSegmentationModel } from '../types';

export interface SegmentationGroundTruthItem {
  id: string;
  imageUri: string;
  expectedForegroundRatio: number;
}

export interface SegmentationBenchmarkReport {
  totalItems: number;
  avgLatencyMs: number;
  status: 'DATASET REQUIRED' | 'EVALUATION COMPLETE';
  evaluatedAt: string;
}

export class SegmentationBenchmarkRunner {
  public static async runBenchmark(
    model: IGarmentSegmentationModel,
    dataset: SegmentationGroundTruthItem[]
  ): Promise<SegmentationBenchmarkReport> {
    if (!dataset || dataset.length === 0) {
      return {
        totalItems: 0,
        avgLatencyMs: 0,
        status: 'DATASET REQUIRED',
        evaluatedAt: new Date().toISOString(),
      };
    }

    let totalLatency = 0;

    for (const item of dataset) {
      const start = Date.now();
      await model.segmentGarment(item.imageUri);
      totalLatency += Date.now() - start;
    }

    return {
      totalItems: dataset.length,
      avgLatencyMs: Math.round(totalLatency / dataset.length),
      status: 'EVALUATION COMPLETE',
      evaluatedAt: new Date().toISOString(),
    };
  }
}
