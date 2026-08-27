import { Garment } from '../../types/garment';
import { OutfitCandidate, StylingContext, CandidateArchetype } from '../../types/stylist';
import { PreferenceLearningService } from './preferenceLearningService';
import { trendProvider } from './trendProvider';

export const StylingEngine = {
  /**
   * Generates ranked outfit recommendations using only the user's actual owned wardrobe
   */
  async generateRecommendations(
    userId: string,
    wardrobe: Garment[],
    context: StylingContext
  ): Promise<OutfitCandidate[]> {
    if (!wardrobe || wardrobe.length === 0) {
      return [];
    }

    // 1. Group wardrobe strictly by category
    const tops = wardrobe.filter((g) => g.category === 'tops');
    const bottoms = wardrobe.filter((g) => g.category === 'bottoms');
    const shoes = wardrobe.filter((g) => g.category === 'shoes');
    const outerwear = wardrobe.filter((g) => g.category === 'outerwear');
    const accessories = wardrobe.filter((g) => g.category === 'accessories');

    // Need at least top and bottom
    if (tops.length === 0 || bottoms.length === 0) {
      return [];
    }

    // 2. Fetch user's persistent preference weights
    const preferences = await PreferenceLearningService.getSignals(userId);
    const trends = await trendProvider.getCurrentTrends();

    const candidates: OutfitCandidate[] = [];

    // Fallback default shoes if none exist in closet
    const fallbackShoe: Garment = shoes[0] || {
      id: 'placeholder_shoes',
      user_id: userId,
      name: 'Essential Footwear',
      category: 'shoes',
      original_image: '',
      primary_color: '#111111',
      favorite: false,
      user_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 3. Generate combinatorial combinations
    const scoredLooks: Array<{
      top: Garment;
      bottom: Garment;
      shoe: Garment;
      layer?: Garment;
      acc?: Garment;
      score: number;
      archetype: CandidateArchetype;
      label: string;
      rationale: string;
      highlights: string[];
    }> = [];

    for (const top of tops) {
      for (const bottom of bottoms) {
        for (const shoe of (shoes.length > 0 ? shoes : [fallbackShoe])) {
          let score = 1.0;
          const highlights: string[] = [];

          // Fit preference weighting
          if (top.fit && preferences.fitWeights[top.fit]) {
            score *= preferences.fitWeights[top.fit];
          }
          if (bottom.fit && preferences.fitWeights[bottom.fit]) {
            score *= preferences.fitWeights[bottom.fit];
          }

          // Occasion match
          const targetOccasion = typeof context.occasion === 'string' ? context.occasion : '';
          const topOccMatch = top.occasions?.some((o) => o.toLowerCase().includes(targetOccasion.toLowerCase()));
          const botOccMatch = bottom.occasions?.some((o) => o.toLowerCase().includes(targetOccasion.toLowerCase()));

          if (topOccMatch || botOccMatch) {
            score *= 1.35;
            highlights.push(`Tailored for ${targetOccasion}`);
          }

          // Recency Penalty (Garments worn in the last 2 days get damped to encourage wardrobe rotation)
          const nowMs = Date.now();
          const oneDayMs = 24 * 60 * 60 * 1000;

          if (top.last_worn) {
            const topWornMs = new Date(top.last_worn).getTime();
            if (nowMs - topWornMs < 2 * oneDayMs) {
              score *= 0.65; // Recency penalty
            }
          }

          if (bottom.last_worn) {
            const botWornMs = new Date(bottom.last_worn).getTime();
            if (nowMs - botWornMs < 2 * oneDayMs) {
              score *= 0.65; // Recency penalty
            }
          }

          // Silhouette / Proportion balance
          if (top.fit === 'Oversized' && (bottom.fit === 'Relaxed' || bottom.fit === 'Regular')) {
            score *= 1.2;
            highlights.push('Balanced contemporary silhouette');
          }

          // Color harmony
          const isNeutralPair =
            ['#111111', '#1A1A1A', '#2A2927', '#F0EFEA', '#FFFFFF'].includes(top.primary_color) &&
            ['#111111', '#1A1A1A', '#2B2C2E', '#F0EFEA', '#4B6B94'].includes(bottom.primary_color);

          if (isNeutralPair) {
            score *= 1.25;
            highlights.push('Editorial neutral harmony');
          }

          // Unworn / Underused garment boost
          const isUnwornPair = (!top.wear_count || top.wear_count === 0) || (!bottom.wear_count || bottom.wear_count === 0);
          if (isUnwornPair) {
            score *= preferences.unwornPieceBoost;
            highlights.push('Rediscovered wardrobe piece');
          }

          // Optional outerwear layer for evening / mild weather
          const layer = outerwear.length > 0 ? outerwear[0] : undefined;
          const acc = accessories.length > 0 ? accessories[0] : undefined;

          // Deduce archetype
          let archetype: CandidateArchetype = 'curated_signature';
          let label = 'Signature Look';
          let rationale = `A balanced combination of your ${top.name} and ${bottom.name}, curated for ${targetOccasion || 'effortless styling'}.`;

          if (top.fit === 'Oversized' || bottom.fit === 'Relaxed') {
            archetype = 'relaxed_contemporary';
            label = 'Relaxed Contemporary';
            rationale = `Modern relaxed silhouette pairing ${top.name} with ${bottom.name} for comfortable sophistication.`;
          }

          if (layer) {
            archetype = 'trend_forward';
            label = 'Editorial Layering';
            rationale = `Layered with ${layer.name} for structured depth, reflecting current tailored street trends.`;
          }

          scoredLooks.push({
            top,
            bottom,
            shoe,
            layer,
            acc,
            score,
            archetype,
            label,
            rationale,
            highlights: highlights.length > 0 ? highlights : ['Clean proportions', 'Effortless styling'],
          });
        }
      }
    }

    // 4. Sort by highest compatibility score
    scoredLooks.sort((a, b) => b.score - a.score);

    // 5. Select top distinct candidates (e.g. up to 3 distinct archetypes/looks)
    const selected = scoredLooks.slice(0, 3);

    return selected.map((item, idx) => ({
      id: `rec_${idx + 1}_${Date.now()}`,
      name: `${item.label} ${idx + 1}`,
      archetype: item.archetype,
      archetypeLabel: item.label,
      garments: {
        top: item.top,
        bottom: item.bottom,
        shoes: item.shoe,
        outerwear: item.layer,
        accessory: item.acc,
      },
      rationale: item.rationale,
      compatibilityScore: Math.min(98, Math.round(item.score * 75)),
      highlightedAttributes: item.highlights,
    }));
  },
};
