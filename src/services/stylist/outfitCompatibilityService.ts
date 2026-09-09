import { Garment } from '../../types/garment';
import { GarmentCategory } from '../../constants/categories';
import { StylingContext, OutfitCandidate, CandidateArchetype } from '../../types/stylist';

export type CompatibilityRating = 'compatible' | 'acceptable' | 'incompatible';

export interface OutfitSlots {
  top?: Garment;
  bottom?: Garment;
  shoes?: Garment;
  outerwear?: Garment;
  accessory?: Garment;
}

export interface ColorEvaluation {
  level: 'harmonious' | 'balanced' | 'clashing';
  reason: string;
  isNeutralDominant: boolean;
  accentColors: string[];
}

export interface ProportionEvaluation {
  level: 'balanced' | 'relaxed' | 'structured' | 'standard';
  reason: string;
}

export interface OccasionEvaluation {
  aligned: boolean;
  matchingGarments: string[];
  reason: string;
}

export interface WeatherEvaluation {
  evaluated: boolean;
  suitable: boolean;
  reason: string;
}

export interface OutfitEvaluationResult {
  rating: CompatibilityRating;
  isValidBase: boolean;
  missingCategories: GarmentCategory[];
  rationale: string;
  highlights: string[];
  color: ColorEvaluation;
  proportion: ProportionEvaluation;
  occasion: OccasionEvaluation;
  weather: WeatherEvaluation;
}

export interface WardrobeSufficiencyResult {
  isSufficient: boolean;
  missingCategory?: GarmentCategory | 'wardrobe';
  guidanceMessage?: string;
}

// Known neutral color keywords / hex representations
const NEUTRAL_COLORS = new Set([
  '#111111', '#1a1a1a', '#000000', '#222222', '#2b2c2e', '#2a2927', '#333333',
  '#ffffff', '#f9f9f8', '#f4f3ee', '#f0efea', '#ebe9e3', '#e8e6e1', '#d1cfc7',
  '#808080', '#55575e', '#8e9098', '#666666', '#999999', '#cccccc',
  '#4b6b94', '#2c3e50', // Denim / Navy neutrals
  '#8b6d55', '#a3846b', '#c2b280', '#d2b48c', '#e6ddc4', // Khaki / Taupe / Camel
]);

const NEUTRAL_NAMES = [
  'black', 'white', 'grey', 'gray', 'charcoal', 'cream', 'off-white', 'beige',
  'tan', 'camel', 'khaki', 'taupe', 'navy', 'denim', 'slate', 'ivory',
];

export const OutfitCompatibilityService = {
  /**
   * Identifies whether a color is neutral based on hex or common name
   */
  isNeutralColor(colorStr?: string): boolean {
    if (!colorStr) return true; // Refused / missing color defaults neutral-safe
    const lower = colorStr.toLowerCase().trim();
    if (NEUTRAL_COLORS.has(lower)) return true;
    return NEUTRAL_NAMES.some((n) => lower.includes(n));
  },

  /**
   * Evaluates color harmony across active garments
   * - Neutral + Neutral -> Harmonious
   * - Neutral Base + Single Accent -> Balanced
   * - 2+ competing strong accents -> Clashing penalty
   */
  evaluateColorHarmony(garments: Garment[]): ColorEvaluation {
    const validGarments = garments.filter((g) => Boolean(g && g.primary_color));
    if (validGarments.length === 0) {
      return {
        level: 'balanced',
        reason: 'Clean neutral baseline',
        isNeutralDominant: true,
        accentColors: [],
      };
    }

    const accents: string[] = [];
    let neutralCount = 0;

    for (const g of validGarments) {
      if (this.isNeutralColor(g.primary_color)) {
        neutralCount++;
      } else {
        accents.push(g.primary_color);
      }
    }

    const isNeutralDominant = neutralCount >= validGarments.length - 1;

    if (accents.length === 0) {
      return {
        level: 'harmonious',
        reason: 'Timeless neutral-on-neutral palette with quiet sophistication',
        isNeutralDominant: true,
        accentColors: [],
      };
    }

    if (accents.length === 1) {
      return {
        level: 'balanced',
        reason: `Neutral foundation grounds the singular ${accents[0]} statement piece`,
        isNeutralDominant: true,
        accentColors: accents,
      };
    }

    // 2 or more distinct accents
    const uniqueAccents = Array.from(new Set(accents.map((a) => a.toLowerCase())));
    if (uniqueAccents.length <= 1) {
      return {
        level: 'harmonious',
        reason: 'Cohesive monochromatic accent tones across layers',
        isNeutralDominant: false,
        accentColors: uniqueAccents,
      };
    }

    return {
      level: 'clashing',
      reason: 'Multiple strong contrasting color accents compete for visual focus',
      isNeutralDominant: false,
      accentColors: uniqueAccents,
    };
  },

  /**
   * Evaluates silhouette and proportion balance between top, bottom, and layer
   */
  evaluateProportions(top?: Garment, bottom?: Garment, layer?: Garment): ProportionEvaluation {
    const topFit = top?.fit || 'Regular';
    const bottomFit = bottom?.fit || 'Regular';

    if (topFit === 'Oversized' && (bottomFit === 'Regular' || bottomFit === 'Slim')) {
      return {
        level: 'balanced',
        reason: `The generous volume of the ${top?.name || 'top'} is cleanly anchored by the narrower bottom`,
      };
    }

    if ((topFit === 'Slim' || topFit === 'Fitted') && (bottomFit === 'Relaxed' || bottomFit === 'Regular')) {
      return {
        level: 'structured',
        reason: `Fitted upper profile establishes crisp contrast against the fluid drape below`,
      };
    }

    if (topFit === 'Oversized' && bottomFit === 'Relaxed') {
      return {
        level: 'relaxed',
        reason: `Relaxed streetwear silhouette creates effortless contemporary ease`,
      };
    }

    if (layer) {
      return {
        level: 'structured',
        reason: `The ${layer.name} provides clean tailored architectural lines over the base silhouette`,
      };
    }

    return {
      level: 'standard',
      reason: 'Classic balanced proportions suitable for versatile daily wear',
    };
  },

  /**
   * Checks whether garments are tailored to the requested occasion
   */
  evaluateOccasion(garments: Garment[], targetOccasion?: string): OccasionEvaluation {
    if (!targetOccasion) {
      return {
        aligned: true,
        matchingGarments: [],
        reason: 'Versatile styling appropriate for everyday wear',
      };
    }

    const normTarget = targetOccasion.toLowerCase();
    const matches: string[] = [];

    for (const g of garments) {
      if (g.occasions && g.occasions.some((o) => o.toLowerCase().includes(normTarget))) {
        matches.push(g.name);
      }
    }

    if (matches.length > 0) {
      return {
        aligned: true,
        matchingGarments: matches,
        reason: `Selected pieces natively match ${targetOccasion} settings`,
      };
    }

    return {
      aligned: true, // Graceful fallback
      matchingGarments: [],
      reason: `Adaptable pieces styled into a refined ${targetOccasion} direction`,
    };
  },

  /**
   * Evaluates weather suitability only when real weather data is present
   */
  evaluateWeather(garments: Garment[], weather?: StylingContext['weather']): WeatherEvaluation {
    if (!weather) {
      return {
        evaluated: false,
        suitable: true,
        reason: '',
      };
    }

    const hasOuterwear = garments.some((g) => g.category === 'outerwear');

    if (weather.tempF < 60 || weather.condition === 'cool' || weather.condition === 'cold') {
      if (hasOuterwear) {
        return {
          evaluated: true,
          suitable: true,
          reason: `Outerwear layer provides essential insulation for ${weather.tempF}°F weather`,
        };
      } else {
        return {
          evaluated: true,
          suitable: false,
          reason: `Cooler conditions (${weather.tempF}°F) benefit from adding a tailored jacket or coat`,
        };
      }
    }

    if (weather.tempF > 78 || weather.condition === 'warm') {
      if (hasOuterwear) {
        return {
          evaluated: true,
          suitable: false,
          reason: `Warm conditions (${weather.tempF}°F) favor unlayered breathable styling`,
        };
      }
      return {
        evaluated: true,
        suitable: true,
        reason: `Lightweight breathable foundation tailored for warm ${weather.tempF}°F temperatures`,
      };
    }

    return {
      evaluated: true,
      suitable: true,
      reason: `Comfortable styling tuned for mild ${weather.tempF}°F temperatures`,
    };
  },

  /**
   * Check whether the user's wardrobe has enough pieces to construct valid outfits
   */
  checkWardrobeSufficiency(wardrobe: Garment[]): WardrobeSufficiencyResult {
    if (!wardrobe || wardrobe.length === 0) {
      return {
        isSufficient: false,
        missingCategory: 'wardrobe',
        guidanceMessage: 'Add garments to your closet so AURA can curate complete looks.',
      };
    }

    const hasTops = wardrobe.some((g) => g.category === 'tops');
    const hasBottoms = wardrobe.some((g) => g.category === 'bottoms');
    const hasShoes = wardrobe.some((g) => g.category === 'shoes');

    if (!hasTops) {
      return {
        isSufficient: false,
        missingCategory: 'tops',
        guidanceMessage: 'Add a top to your closet to unlock full outfit curation.',
      };
    }

    if (!hasBottoms) {
      return {
        isSufficient: false,
        missingCategory: 'bottoms',
        guidanceMessage: 'Add a pair of trousers or bottoms to unlock complete looks.',
      };
    }

    if (!hasShoes) {
      return {
        isSufficient: false,
        missingCategory: 'shoes',
        guidanceMessage: 'Add a pair of shoes to ground your personal wardrobe looks.',
      };
    }

    return {
      isSufficient: true,
    };
  },

  /**
   * Evaluates complete or partial outfit slots
   */
  evaluateOutfit(slots: OutfitSlots, context?: StylingContext): OutfitEvaluationResult {
    const missing: GarmentCategory[] = [];
    if (!slots.top) missing.push('tops');
    if (!slots.bottom) missing.push('bottoms');
    if (!slots.shoes) missing.push('shoes');

    const isValidBase = missing.length === 0;
    const activeGarments = [slots.top, slots.bottom, slots.shoes, slots.outerwear, slots.accessory].filter(
      Boolean
    ) as Garment[];

    const color = this.evaluateColorHarmony(activeGarments);
    const proportion = this.evaluateProportions(slots.top, slots.bottom, slots.outerwear);
    const occasion = this.evaluateOccasion(activeGarments, typeof context?.occasion === 'string' ? context.occasion : undefined);
    const weather = this.evaluateWeather(activeGarments, context?.weather);

    let rating: CompatibilityRating = 'compatible';
    if (!isValidBase || color.level === 'clashing') {
      rating = !isValidBase ? 'incompatible' : 'acceptable';
    }

    // Synthesize qualitative "Why This Works" rationale
    let rationale = '';
    const highlights: string[] = [];

    if (!isValidBase) {
      rationale = `Outfit requires a ${missing.join(' and ')} to form a complete cohesive look.`;
    } else {
      const topName = slots.top!.name;
      const botName = slots.bottom!.name;
      const shoeName = slots.shoes!.name;

      if (slots.outerwear) {
        rationale = `The ${slots.outerwear.name} frames the ${topName}, while ${botName} and ${shoeName} provide a grounded base. ${color.reason}.`;
        highlights.push('Editorial Layering');
      } else {
        rationale = `Your ${topName} pairs naturally with ${botName}, while ${shoeName} anchors the clean profile. ${proportion.reason}.`;
        highlights.push(proportion.level === 'balanced' ? 'Balanced Proportions' : 'Clean Proportions');
      }

      if (color.level === 'harmonious') {
        highlights.push('Neutral Harmony');
      } else if (color.level === 'balanced') {
        highlights.push('Focused Accent');
      }

      if (occasion.matchingGarments.length > 0) {
        highlights.push(context?.occasion ? `${context.occasion} Ready` : 'Occasion Aligned');
      }
    }

    return {
      rating,
      isValidBase,
      missingCategories: missing,
      rationale,
      highlights,
      color,
      proportion,
      occasion,
      weather,
    };
  },

  /**
   * Generates up to 3 coherent styling proposals (LOOK 01, LOOK 02, LOOK 03)
   * strictly using the user's actual uploaded wardrobe.
   */
  generateLookCandidates(wardrobe: Garment[], context: StylingContext): OutfitCandidate[] {
    const sufficiency = this.checkWardrobeSufficiency(wardrobe);
    if (!sufficiency.isSufficient) {
      return [];
    }

    const tops = wardrobe.filter((g) => g.category === 'tops');
    const bottoms = wardrobe.filter((g) => g.category === 'bottoms');
    const shoes = wardrobe.filter((g) => g.category === 'shoes');
    const outerwear = wardrobe.filter((g) => g.category === 'outerwear');
    const accessories = wardrobe.filter((g) => g.category === 'accessories');

    interface CandidateProposal {
      slots: OutfitSlots;
      archetype: CandidateArchetype;
      label: string;
      score: number;
    }

    const proposals: CandidateProposal[] = [];

    // Candidate 1: Curated Signature / Minimalist Look (Core neutral/balanced foundation)
    for (const top of tops) {
      for (const bottom of bottoms) {
        for (const shoe of shoes) {
          let score = 1.0;
          const isNeutralPair = this.isNeutralColor(top.primary_color) && this.isNeutralColor(bottom.primary_color);
          if (isNeutralPair) score += 0.4;

          const prop = this.evaluateProportions(top, bottom);
          if (prop.level === 'balanced' || prop.level === 'structured') score += 0.3;

          // Target occasion match
          const targetOcc = typeof context.occasion === 'string' ? context.occasion.toLowerCase() : '';
          if (top.occasions?.some((o) => o.toLowerCase().includes(targetOcc))) score += 0.2;
          if (bottom.occasions?.some((o) => o.toLowerCase().includes(targetOcc))) score += 0.2;

          // Unworn piece encouragement
          if (!top.wear_count || !bottom.wear_count) score += 0.15;

          proposals.push({
            slots: { top, bottom, shoes: shoe },
            archetype: 'curated_signature',
            label: 'Editorial Minimal',
            score,
          });
        }
      }
    }

    // Sort to find best base proposals
    proposals.sort((a, b) => b.score - a.score);

    const candidates: OutfitCandidate[] = [];

    // Select Look 1: Highest rated minimal/signature proposal
    if (proposals.length > 0) {
      const best = proposals[0];
      const evalResult = this.evaluateOutfit(best.slots, context);
      candidates.push({
        id: `look_01_${Date.now()}`,
        name: 'Editorial Minimal',
        archetype: 'curated_signature',
        archetypeLabel: 'Editorial Minimal',
        garments: {
          top: best.slots.top!,
          bottom: best.slots.bottom!,
          shoes: best.slots.shoes!,
        },
        rationale: evalResult.rationale,
        compatibilityScore: 92,
        highlightedAttributes: evalResult.highlights,
      });
    }

    // Select Look 2: Relaxed / Street contemporary proposal (distinct bottom or top if available)
    const relaxedProposal = proposals.find(
      (p) =>
        (p.slots.top?.fit === 'Oversized' || p.slots.bottom?.fit === 'Relaxed' || p.slots.top?.id !== candidates[0]?.garments.top.id) &&
        p.slots.bottom?.id !== candidates[0]?.garments.bottom.id
    ) || proposals[1] || proposals[0];

    if (relaxedProposal && (candidates.length < 2 || relaxedProposal.slots.top?.id !== candidates[0]?.garments.top.id || relaxedProposal.slots.bottom?.id !== candidates[0]?.garments.bottom.id)) {
      const evalResult = this.evaluateOutfit(relaxedProposal.slots, context);
      candidates.push({
        id: `look_02_${Date.now() + 1}`,
        name: 'Relaxed Contemporary',
        archetype: 'relaxed_contemporary',
        archetypeLabel: 'Relaxed Contemporary',
        garments: {
          top: relaxedProposal.slots.top!,
          bottom: relaxedProposal.slots.bottom!,
          shoes: relaxedProposal.slots.shoes!,
        },
        rationale: evalResult.rationale,
        compatibilityScore: 88,
        highlightedAttributes: evalResult.highlights,
      });
    }

    // Select Look 3: Layered / Statement proposal (includes outerwear or accessory if available)
    const availableLayer = outerwear.length > 0 ? outerwear[0] : undefined;
    const availableAcc = accessories.length > 0 ? accessories[0] : undefined;

    const baseForLayer = proposals.find(
      (p) =>
        candidates.every((c) => c.garments.top.id !== p.slots.top?.id || c.garments.bottom.id !== p.slots.bottom?.id)
    ) || proposals[2] || proposals[0];

    if (baseForLayer && candidates.length < 3) {
      const slots: OutfitSlots = {
        top: baseForLayer.slots.top,
        bottom: baseForLayer.slots.bottom,
        shoes: baseForLayer.slots.shoes,
        outerwear: availableLayer,
        accessory: availableAcc,
      };

      const evalResult = this.evaluateOutfit(slots, context);
      const label = availableLayer ? 'Editorial Layering' : availableAcc ? 'Elevated Accent' : 'Tailored Classic';
      candidates.push({
        id: `look_03_${Date.now() + 2}`,
        name: label,
        archetype: 'trend_forward',
        archetypeLabel: label,
        garments: {
          top: slots.top!,
          bottom: slots.bottom!,
          shoes: slots.shoes!,
          outerwear: slots.outerwear,
          accessory: slots.accessory,
        },
        rationale: evalResult.rationale,
        compatibilityScore: 90,
        highlightedAttributes: evalResult.highlights,
      });
    }

    return candidates;
  },
};
