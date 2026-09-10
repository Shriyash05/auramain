/**
 * Live Style Intelligence Service
 * 
 * Provides instantaneous, deterministic, attribute-grounded styling feedback
 * on every garment swipe in AURA Studio without ML latency or external API calls.
 * 
 * Enforces:
 * - Real-time qualitative editorial headlines
 * - Palette analysis (dominant tone, accent pop, contrast levels)
 * - Volume / proportion balance (oversized vs regular/slim)
 * - Weak combination detection with constructive advice ("Try another bottom")
 * - Zero fabricated numerical scores (e.g. no fake 94% match)
 */

import { Garment } from '../../types/garment';
import { StylingContext } from '../../types/stylist';
import { OutfitCompatibilityService } from './outfitCompatibilityService';

export interface LivePaletteInsight {
  dominantColorFamily: string;
  accentColor?: string;
  contrastLevel: 'subtle' | 'balanced' | 'high_contrast';
  colorPaletteDescription: string;
  pairingAdvice: string;
}

export interface LiveStyleInsight {
  headline: string;
  explanation: string;
  status: 'harmonious' | 'balanced' | 'consider_alternative';
  palette: LivePaletteInsight;
  attributePills: string[];
  suggestedAction?: {
    category: 'tops' | 'bottoms' | 'shoes';
    message: string;
  };
}

export class LiveStyleIntelligenceService {
  /**
   * Generates live styling intelligence for current slot configuration
   */
  static evaluateLiveOutfit(
    slots: {
      top?: Garment;
      bottom?: Garment;
      shoes?: Garment;
      outerwear?: Garment;
      accessory?: Garment;
    },
    context?: StylingContext
  ): LiveStyleInsight {
    const { top, bottom, shoes, outerwear } = slots;

    // 1. Partial / Incomplete outfit handling
    if (!top || !bottom) {
      return {
        headline: 'Composing your look...',
        explanation: 'Select a top and bottom to unlock live style and proportion intelligence.',
        status: 'balanced',
        palette: {
          dominantColorFamily: 'Neutral',
          contrastLevel: 'balanced',
          colorPaletteDescription: 'Awaiting primary garments',
          pairingAdvice: 'Pair a structured or relaxed piece to set the outfit tone.',
        },
        attributePills: ['Personal Closet', 'In Progress'],
      };
    }

    const activeGarments = [top, bottom, shoes, outerwear].filter(Boolean) as Garment[];

    // 2. Color Harmony & Palette Evaluation
    const colorEval = OutfitCompatibilityService.evaluateColorHarmony(activeGarments);
    const propEval = OutfitCompatibilityService.evaluateProportions(top, bottom, outerwear);

    const topColor = (top.primary_color || '').toLowerCase();
    const bottomColor = (bottom.primary_color || '').toLowerCase();
    const shoesColor = (shoes?.primary_color || '').toLowerCase();

    const topIsNeutral = OutfitCompatibilityService.isNeutralColor(topColor);
    const bottomIsNeutral = OutfitCompatibilityService.isNeutralColor(bottomColor);

    // Analyze Contrast Level
    let contrastLevel: LivePaletteInsight['contrastLevel'] = 'balanced';
    if (colorEval.level === 'clashing') {
      contrastLevel = 'high_contrast';
    } else if (colorEval.isNeutralDominant && colorEval.accentColors.length === 0) {
      const isMonochrome = topColor === bottomColor && topColor !== '';
      contrastLevel = isMonochrome ? 'subtle' : 'balanced';
    } else if (colorEval.accentColors.length === 1) {
      contrastLevel = 'balanced';
    }

    // Determine Dominant Color Family
    let dominantColorFamily = 'Neutral Baseline';
    if (!bottomIsNeutral && bottom.primary_color) {
      dominantColorFamily = `${bottom.primary_color} Base`;
    } else if (!topIsNeutral && top.primary_color) {
      dominantColorFamily = `${top.primary_color} Statement`;
    } else if (topIsNeutral && bottomIsNeutral) {
      dominantColorFamily = 'Neutral Tonal';
    }

    // 3. Build Qualitative Editorial Insight
    let headline = 'Clean & balanced';
    let explanation = '';
    let status: LiveStyleInsight['status'] = 'harmonious';
    let pairingAdvice = '';
    const attributePills: string[] = [];

    // Check for Weak / Clashing Combinations
    if (colorEval.level === 'clashing') {
      headline = 'Try another bottom';
      status = 'consider_alternative';
      explanation = `The vibrant ${top.primary_color} top competes with the strong tone of the ${bottom.primary_color} bottom. A darker neutral bottom creates cleaner visual balance.`;
      pairingAdvice = 'Swap the bottom for black, charcoal, or deep navy to let the top anchor the look.';
      attributePills.push('Competing Accents', 'Contrast Adjustment');
      return {
        headline,
        explanation,
        status,
        palette: {
          dominantColorFamily,
          accentColor: colorEval.accentColors[0],
          contrastLevel: 'high_contrast',
          colorPaletteDescription: 'Competing primary tones',
          pairingAdvice,
        },
        attributePills,
        suggestedAction: {
          category: 'bottoms',
          message: 'Try a neutral bottom to let the top stand out cleanly.',
        },
      };
    }

    // Check for Softer Summer / Light Palette
    const isLightTop = topColor.includes('white') || topColor.includes('cream') || topColor.includes('beige') || topColor.includes('#fff') || topColor.includes('#f');
    const isLightBottom = bottomColor.includes('white') || bottomColor.includes('cream') || bottomColor.includes('beige') || bottomColor.includes('#f');
    const isDarkBottom = bottomColor.includes('black') || bottomColor.includes('charcoal') || bottomColor.includes('navy') || bottomColor.includes('#1') || bottomColor.includes('#0');

    if (isLightTop && isLightBottom) {
      headline = 'Softer tonal palette';
      explanation = `Light neutral tones across the ${top.name} and ${bottom.name} create a luminous, effortless feel. ${shoes ? `${shoes.name} grounds the composition.` : ''}`.trim();
      pairingAdvice = 'Keep accessories minimalist to preserve the clean tonal flow.';
      attributePills.push('Tonal Harmony', 'Soft Neutrals');
    } else if (isDarkBottom && isLightTop) {
      headline = 'Clean & balanced';
      explanation = `The darker bottom cleanly anchors the lighter top, while ${shoes ? `${shoes.name} maintains a relaxed finish.` : 'proportions stay classic.'}`.trim();
      pairingAdvice = 'High-contrast pairing suitable for casual meetings or everyday wear.';
      attributePills.push('Classic Contrast', propEval.level === 'balanced' ? 'Balanced Volume' : 'Clean Line');
    } else if (propEval.level === 'structured') {
      headline = 'Structured & modern';
      explanation = `${propEval.reason}. The visual line remains crisp and deliberate throughout.`;
      pairingAdvice = 'Minimalist footwear complements this tailored silhouette.';
      attributePills.push('Tailored Fit', 'Volume Balance');
    } else if (colorEval.accentColors.length === 1) {
      headline = 'Harmonious accent pop';
      explanation = `The ${colorEval.accentColors[0]} statement is cleanly supported by surrounding neutral foundations without overwhelming the silhouette.`;
      pairingAdvice = 'Single accent color keeps the eye anchored naturally.';
      attributePills.push('Statement Anchor', 'Neutral Base');
    } else {
      headline = 'Everyday versatility';
      explanation = `Cohesive tones between ${top.name} and ${bottom.name} deliver a balanced, adaptable aesthetic for ${context?.occasion || 'any setting'}.`;
      pairingAdvice = 'Layer with outerwear if weather cools down.';
      attributePills.push('Versatile Fit', 'Balanced Palette');
    }

    // Footwear specific observation
    if (shoes) {
      if (shoesColor.includes('white') || shoesColor.includes('#fff')) {
        attributePills.push('Relaxed Footwear');
      } else {
        attributePills.push('Grounded Base');
      }
    }

    return {
      headline,
      explanation,
      status,
      palette: {
        dominantColorFamily,
        accentColor: colorEval.accentColors[0],
        contrastLevel,
        colorPaletteDescription: colorEval.reason,
        pairingAdvice: pairingAdvice || 'Palette is cohesive and ready to wear.',
      },
      attributePills,
    };
  }
}

export const liveStyleIntelligenceService = LiveStyleIntelligenceService;
