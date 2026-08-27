import { trendProvider } from '../stylist/trendProvider';
import { DatabaseService } from '../database/databaseService';
import { Garment } from '../../types/garment';

export interface PersonalizedTrend {
  trendId: string;
  name: string;
  category: string;
  description: string;
  isReadyInCloset: boolean;
  matchingGarments: Garment[];
  stylingTip: string;
}

export const TrendIntelligenceService = {
  async getPersonalizedTrends(userId: string): Promise<PersonalizedTrend[]> {
    const garments = await DatabaseService.getGarments(userId);
    const trendSnapshots = await trendProvider.getCurrentTrends();

    const result: PersonalizedTrend[] = [];

    for (const trend of trendSnapshots) {
      // Check matching silhouettes and color palettes
      const matchingGarments = garments.filter((g) => {
        const isSilhouetteMatch = g.fit && trend.recommendedSilhouettes.some((s) => s.toLowerCase() === g.fit?.toLowerCase());
        const isColorMatch = g.primary_color && trend.keyColorPalettes.some((c: string) => c.toLowerCase() === g.primary_color?.toLowerCase());
        return isSilhouetteMatch || isColorMatch;
      });

      const isReady = matchingGarments.length >= 2;

      result.push({
        trendId: trend.id,
        name: trend.title,
        category: trend.keyAesthetics[0] || 'Contemporary',
        description: trend.description,
        isReadyInCloset: isReady,
        matchingGarments,
        stylingTip: isReady
          ? `You own ${matchingGarments.length} pieces that fit this trend. Style your ${matchingGarments[0].name} for an elevated look.`
          : `Pair your neutral basics with relaxed silhouettes to experiment with ${trend.title.toLowerCase()}.`,
      });
    }

    return result;
  },
};
