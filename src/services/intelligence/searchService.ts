import { DatabaseService } from '../database/databaseService';
import { Garment } from '../../types/garment';
import { Outfit } from '../../types/outfit';

export interface SearchResults {
  garments: Garment[];
  outfits: Outfit[];
  totalMatches: number;
}

export const UniversalSearchService = {
  async searchWardrobeAndOutfits(userId: string, query: string): Promise<SearchResults> {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { garments: [], outfits: [], totalMatches: 0 };
    }

    const allGarments = await DatabaseService.getGarments(userId);
    const allOutfits = await DatabaseService.getOutfits(userId);

    const matchingGarments = allGarments.filter((g) => {
      return (
        g.name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        (g.fit && g.fit.toLowerCase().includes(q)) ||
        (g.primary_color && g.primary_color.toLowerCase().includes(q))
      );
    });

    const matchingOutfits = allOutfits.filter((o) => {
      return (
        o.name.toLowerCase().includes(q) ||
        (o.occasion && o.occasion.toLowerCase().includes(q)) ||
        (o.notes && o.notes.toLowerCase().includes(q))
      );
    });

    return {
      garments: matchingGarments,
      outfits: matchingOutfits,
      totalMatches: matchingGarments.length + matchingOutfits.length,
    };
  },
};
