import { AuraModelRouter } from '../tools/ai-benchmark/modelRouter';
import { IntentBenchmarkRunner } from '../tools/ai-benchmark/intent/benchmark';
import { GarmentBenchmarkRunner } from '../tools/ai-benchmark/garment/benchmark';
import { IIntentModel, IGarmentVisionModel } from '../tools/ai-benchmark/types';

describe('AuraModelRouter & Benchmark Suite', () => {
  it('routes intent queries cleanly with deterministic fallback', async () => {
    const result = await AuraModelRouter.run('natural-language-intent', 'Make this outfit more casual for dinner');
    expect(result.intent).toBe('MODIFY_OUTFIT');
    expect(result.constraints.target_vibe).toBe('Casual');
  });

  it('reports model health status across all domains', () => {
    const health = AuraModelRouter.getModelHealth();
    expect(health.length).toBe(5);
    expect(health.some((h) => h.domain === 'garment-understanding')).toBe(true);
    expect(health.some((h) => h.domain === 'virtual-try-on')).toBe(true);
  });

  it('runs Intent benchmark runner with ground truth dataset', async () => {
    const mockModel: IIntentModel = {
      modelId: 'test-intent-v1',
      version: '1.0.0',
      parseNaturalLanguageIntent: async (p: string) => ({
        intent: p.includes('casual') ? 'MODIFY_OUTFIT' : 'SEARCH_WARDROBE',
        constraints: {},
        confidence: 0.9,
        latency_ms: 10,
      }),
    };

    const report = await IntentBenchmarkRunner.runBenchmark(mockModel, [
      { prompt: 'Make this casual', expectedIntent: 'MODIFY_OUTFIT' },
      { prompt: 'Show me shirts', expectedIntent: 'SEARCH_WARDROBE' },
    ]);

    expect(report.status).toBe('EVALUATION COMPLETE');
    expect(report.intentAccuracy).toBe(1);
    expect(report.totalPrompts).toBe(2);
  });

  it('returns DATASET REQUIRED when benchmark dataset is empty', async () => {
    const mockGarmentModel: IGarmentVisionModel = {
      modelId: 'test-garment-v1',
      version: '1.0.0',
      extractAttributes: async () => ({
        category: 'tops',
        primary_color: '#FFFFFF',
        fit: 'Relaxed',
        season: ['All Season'],
        occasion: ['Casual'],
        formality_score: 0.5,
        confidence: 0.8,
      }),
    };

    const report = await GarmentBenchmarkRunner.runBenchmark(mockGarmentModel, []);
    expect(report.status).toBe('DATASET REQUIRED');
    expect(report.totalItems).toBe(0);
  });
});
