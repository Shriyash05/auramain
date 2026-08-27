import { DatabaseService } from '../database/databaseService';
import { OutfitMemoryService } from '../memory/outfitMemoryService';
import { StyleEvolution } from '../../types/intelligence';

export const StyleIntelligenceService = {
  async getStyleEvolution(userId: string): Promise<StyleEvolution> {
    const garments = await DatabaseService.getGarments(userId);
    const outfits = await DatabaseService.getOutfits(userId);
    const wearLogs = await OutfitMemoryService.getWearLogs(userId);

    // 1. Calculate silhouette frequencies
    const fitCounts: Record<string, number> = {};
    const colorCounts: Record<string, number> = {};

    garments.forEach((g) => {
      if (g.fit) fitCounts[g.fit] = (fitCounts[g.fit] || 0) + 1;
      if (g.primary_color) colorCounts[g.primary_color] = (colorCounts[g.primary_color] || 0) + 1;
    });

    const dominantSilhouettes = Object.entries(fitCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([fit]) => fit)
      .slice(0, 3);

    const topColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c)
      .slice(0, 4);

    // 2. Garment wear statistics
    const sortedByWear = [...garments].sort((a, b) => (b.wear_count || 0) - (a.wear_count || 0));
    const mostWornGarmentIds = sortedByWear.filter((g) => (g.wear_count || 0) > 0).slice(0, 3).map((g) => g.id);
    const underusedGarmentIds = sortedByWear.filter((g) => (g.wear_count || 0) === 0).slice(0, 3).map((g) => g.id);

    // 3. Formulate observed style evolution shifts
    const observedShifts: string[] = [];
    if (dominantSilhouettes.length > 0) {
      observedShifts.push(`Consistent preference for ${dominantSilhouettes[0].toLowerCase()} silhouettes`);
    }
    if (wearLogs.length >= 2) {
      observedShifts.push('Active rotation of contemporary wardrobe basics');
    } else {
      observedShifts.push('Building initial outfit wear history');
    }

    return {
      dominantSilhouettes: dominantSilhouettes.length > 0 ? dominantSilhouettes : ['Relaxed', 'Contemporary'],
      topColors: topColors.length > 0 ? topColors : ['#F0EFEA', '#2B2C2E', '#111111'],
      mostWornGarmentIds,
      underusedGarmentIds,
      observedShifts,
    };
  },
};
