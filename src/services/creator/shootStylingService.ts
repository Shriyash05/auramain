import { DatabaseService } from '../database/databaseService';
import { StylingEngine } from '../stylist/stylingEngine';
import { Garment } from '../../types/garment';
import { OutfitCandidate } from '../../types/stylist';
import { Shoot } from '../../types/creator';

export interface GeneratedLookOption {
  name: string;
  candidate: OutfitCandidate;
  rationale: string;
  is_selected: boolean;
}

export const ShootStylingService = {
  /**
   * Generates a diverse set of looks for a shoot concept
   */
  async generateShootLookSet(
    userId: string,
    shoot: Shoot,
    requestedCount: number = 4
  ): Promise<GeneratedLookOption[]> {
    const wardrobe = await DatabaseService.getGarments(userId);
    if (wardrobe.length === 0) return [];

    // Map shoot context to styling context
    const stylingContext = {
      occasion: (shoot.occasion || 'Casual') as any,
      mood: (shoot.mood || 'Effortless') as any,
      timeOfDay: 'afternoon' as const,
    };

    const candidates = await StylingEngine.generateRecommendations(userId, wardrobe, stylingContext);
    if (candidates.length === 0) return [];

    // Diversity selection algorithm: Select top candidates with diverse piece combinations
    const selectedCandidates: OutfitCandidate[] = [];
    const usedTopIds = new Set<string>();
    const usedBotIds = new Set<string>();

    for (const cand of candidates) {
      if (selectedCandidates.length >= requestedCount) break;

      const topId = cand.garments.top?.id;
      const botId = cand.garments.bottom?.id;

      // Prefer distinct combinations
      const isDuplicateCombo = topId && botId && usedTopIds.has(topId) && usedBotIds.has(botId);

      if (!isDuplicateCombo || selectedCandidates.length < 2) {
        selectedCandidates.push(cand);
        if (topId) usedTopIds.add(topId);
        if (botId) usedBotIds.add(botId);
      }
    }

    // Fallback if strict diversity didn't fill requested count
    if (selectedCandidates.length < requestedCount) {
      for (const cand of candidates) {
        if (selectedCandidates.length >= requestedCount) break;
        if (!selectedCandidates.some((sc) => sc.id === cand.id)) {
          selectedCandidates.push(cand);
        }
      }
    }

    return selectedCandidates.map((cand, idx) => ({
      name: `Look ${(idx + 1).toString().padStart(2, '0')}: ${cand.name}`,
      candidate: cand,
      rationale: `${cand.rationale} Aligned with shoot concept "${shoot.concept}".`,
      is_selected: true,
    }));
  },
};
