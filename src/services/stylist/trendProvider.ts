import { TrendSnapshot } from '../../types/stylist';

export interface ITrendProvider {
  getCurrentTrends(): Promise<TrendSnapshot[]>;
}

export class CuratedTrendProvider implements ITrendProvider {
  async getCurrentTrends(): Promise<TrendSnapshot[]> {
    return [
      {
        id: 'trend_relaxed_tailoring',
        title: 'Relaxed Tailoring',
        description: 'Fluid oversized blazers paired with straight or wide-leg trousers.',
        keyAesthetics: ['Tailored', 'Minimalist', 'Quiet Luxury'],
        recommendedSilhouettes: ['Oversized', 'Relaxed'],
        keyColorPalettes: ['#1A1A1A', '#F0EFEA', '#4B6B94', '#2B2C2E'],
      },
      {
        id: 'trend_monochrome_minimalism',
        title: 'Monochrome Minimalism',
        description: 'Tonal layering in cream, charcoal, and warm neutrals for effortless depth.',
        keyAesthetics: ['Minimalist', 'Monochrome'],
        recommendedSilhouettes: ['Regular', 'Relaxed'],
        keyColorPalettes: ['#F9F9F8', '#111111', '#8E9098'],
      },
    ];
  }
}

export const trendProvider: ITrendProvider = new CuratedTrendProvider();
