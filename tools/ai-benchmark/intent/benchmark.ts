import { IIntentModel } from '../types';

export interface IntentGroundTruthItem {
  prompt: string;
  expectedIntent: string;
}

export interface IntentBenchmarkReport {
  totalPrompts: number;
  intentAccuracy: number;
  avgLatencyMs: number;
  status: 'DATASET REQUIRED' | 'EVALUATION COMPLETE';
  evaluatedAt: string;
}

export class IntentBenchmarkRunner {
  public static async runBenchmark(
    model: IIntentModel,
    dataset: IntentGroundTruthItem[]
  ): Promise<IntentBenchmarkReport> {
    if (!dataset || dataset.length === 0) {
      return {
        totalPrompts: 0,
        intentAccuracy: 0,
        avgLatencyMs: 0,
        status: 'DATASET REQUIRED',
        evaluatedAt: new Date().toISOString(),
      };
    }

    let correct = 0;
    let totalLatency = 0;

    for (const item of dataset) {
      const start = Date.now();
      const res = await model.parseNaturalLanguageIntent(item.prompt);
      totalLatency += Date.now() - start;

      if (res.intent === item.expectedIntent) {
        correct++;
      }
    }

    return {
      totalPrompts: dataset.length,
      intentAccuracy: Number((correct / dataset.length).toFixed(4)),
      avgLatencyMs: Math.round(totalLatency / dataset.length),
      status: 'EVALUATION COMPLETE',
      evaluatedAt: new Date().toISOString(),
    };
  }
}
