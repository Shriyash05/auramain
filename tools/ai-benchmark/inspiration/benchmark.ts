import { IInspirationVisionModel } from '../types';

export interface InspirationGroundTruthItem {
  id: string;
  imageUri: string;
  expectedAesthetic: string;
  expectedMinPieceCount: number;
}

export interface InspirationBenchmarkReport {
  totalItems: number;
  avgLatencyMs: number;
  aestheticMatchRatio: number;
  status: 'DATASET REQUIRED' | 'EVALUATION COMPLETE';
  evaluatedAt: string;
}

export class InspirationBenchmarkRunner {
  public static async runBenchmark(
    model: IInspirationVisionModel,
    dataset: InspirationGroundTruthItem[]
  ): Promise<InspirationBenchmarkReport> {
    if (!dataset || dataset.length === 0) {
      return {
        totalItems: 0,
        avgLatencyMs: 0,
        aestheticMatchRatio: 0,
        status: 'DATASET REQUIRED',
        evaluatedAt: new Date().toISOString(),
      };
    }

    let matchingAesthetics = 0;
    let totalLatency = 0;

    for (const item of dataset) {
      const start = Date.now();
      const res = await model.analyzeInspiration(item.imageUri);
      totalLatency += Date.now() - start;

      if (res.aesthetic.toLowerCase().includes(item.expectedAesthetic.toLowerCase())) {
        matchingAesthetics++;
      }
    }

    return {
      totalItems: dataset.length,
      avgLatencyMs: Math.round(totalLatency / dataset.length),
      aestheticMatchRatio: Number((matchingAesthetics / dataset.length).toFixed(4)),
      status: 'EVALUATION COMPLETE',
      evaluatedAt: new Date().toISOString(),
    };
  }
}
