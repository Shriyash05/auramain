import { inspirationAnalysisProvider } from '../src/services/inspiration/inspirationAnalysisProvider';

describe('InspirationAnalysisProvider', () => {
  it('extracts structured style formula and garment breakdown from an inspiration image', async () => {
    const analysis = await inspirationAnalysisProvider.analyzeInspiration('file:///inspiration.jpg');

    expect(analysis.title).toBeDefined();
    expect(analysis.style_formula).toBeDefined();
    expect(analysis.extracted_pieces.length).toBeGreaterThan(0);

    const hasTop = analysis.extracted_pieces.some((p) => p.category === 'tops');
    const hasBottom = analysis.extracted_pieces.some((p) => p.category === 'bottoms');

    expect(hasTop).toBe(true);
    expect(hasBottom).toBe(true);
  });

  it('provides deterministic fallback if analysis encounters unparseable data', () => {
    const fallback = (inspirationAnalysisProvider as any).getFallbackAnalysis();

    expect(fallback.style_formula).toBeDefined();
    expect(fallback.extracted_pieces.length).toBe(3);
    expect(fallback.aesthetic).toBe('Classic Minimalist');
  });
});
