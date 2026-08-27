import { DatabaseService } from '../database/databaseService';
import { WardrobeGap } from '../../types/intelligence';
import { Garment } from '../../types/garment';

export const WardrobeGapService = {
  /**
   * Analyzes closet deficiencies and detects genuine wardrobe gaps
   */
  async detectWardrobeGaps(userId: string): Promise<WardrobeGap[]> {
    const garments = await DatabaseService.getGarments(userId);
    if (garments.length === 0) return [];

    const tops = garments.filter((g) => g.category === 'tops');
    const bottoms = garments.filter((g) => g.category === 'bottoms');
    const shoes = garments.filter((g) => g.category === 'shoes');
    const outerwear = garments.filter((g) => g.category === 'outerwear');

    const potentialCombos = Math.max(tops.length * bottoms.length, 1);
    const gaps: WardrobeGap[] = [];

    // Check 1: Missing versatile outerwear layer
    if (outerwear.length === 0 && tops.length > 0 && bottoms.length > 0) {
      gaps.push({
        id: 'gap_outerwear_neutral',
        category: 'outerwear',
        title: 'Versatile Lightweight Layer',
        description: 'An unlined blazer or tailored overshirt in neutral tone.',
        potentialOutfitsUnlocked: Math.min(potentialCombos, 6),
        recommendedAttributes: {
          fit: 'Relaxed',
          colors: ['#2B2C2E', '#F0EFEA', '#4A4C50'],
          suggestedStyles: ['Structured Blazer', 'Wool Overshirt'],
        },
        priorityScore: 95,
        whyThisWorks: `You have ${tops.length} tops and ${bottoms.length} bottoms. Adding one neutral layer transforms those into ${Math.min(potentialCombos, 6)} elevated layered looks.`,
      });
    }

    // Check 2: Missing minimal footwear
    if (shoes.length === 0) {
      gaps.push({
        id: 'gap_footwear_clean',
        category: 'shoes',
        title: 'Clean Minimalist Footwear',
        description: 'Low leather sneakers or classic loafers in black or off-white.',
        potentialOutfitsUnlocked: potentialCombos,
        recommendedAttributes: {
          fit: 'Regular',
          colors: ['#FFFFFF', '#111111', '#1A1A1A'],
          suggestedStyles: ['Low Leather Sneaker', 'Chunky Loafer'],
        },
        priorityScore: 90,
        whyThisWorks: 'A clean pair of minimal shoes anchors every casual and evening look in your closet.',
      });
    }

    // Check 3: Missing tailored wide-leg trousers if only casual bottoms exist
    const hasTailoredBottom = bottoms.some((b) => b.fit === 'Relaxed' || b.fit === 'Oversized');
    if (bottoms.length > 0 && !hasTailoredBottom) {
      gaps.push({
        id: 'gap_bottom_tailored',
        category: 'bottoms',
        title: 'Wide-Leg Pleated Trousers',
        description: 'Relaxed tailored trousers to balance oversized tops.',
        potentialOutfitsUnlocked: Math.min(tops.length * 2, 5),
        recommendedAttributes: {
          fit: 'Relaxed',
          colors: ['#2B2C2E', '#1A1A1A', '#E8E6E1'],
          suggestedStyles: ['Pleated Trouser', 'Relaxed Wool Pant'],
        },
        priorityScore: 80,
        whyThisWorks: 'Balances your current tops with modern silhouette proportions.',
      });
    }

    // Check 4: If closet is well-balanced, suggest an accent accessory
    if (gaps.length === 0 && garments.length >= 4) {
      gaps.push({
        id: 'gap_accent_statement',
        category: 'accessories',
        title: 'Minimalist Leather Belt or Crossbody',
        description: 'Subtle textural accent to add depth to monochrome looks.',
        potentialOutfitsUnlocked: Math.min(tops.length, 4),
        recommendedAttributes: {
          fit: 'Regular',
          colors: ['#1A1A1A', '#8C7A6B'],
          suggestedStyles: ['Leather Belt', 'Canvas Tote'],
        },
        priorityScore: 65,
        whyThisWorks: 'Your core wardrobe is solid. A subtle accessory adds dimension to your existing outfits.',
      });
    }

    return gaps.sort((a, b) => b.priorityScore - a.priorityScore);
  },

  /**
   * "You already own it" rule validation:
   * Returns false if the closet already contains a suitable garment matching the gap criteria.
   */
  async userAlreadyOwnsItem(userId: string, category: string, primaryColor?: string): Promise<boolean> {
    const garments = await DatabaseService.getGarments(userId);
    return garments.some((g) => {
      const isCatMatch = g.category === category;
      const isColorMatch = !primaryColor || g.primary_color?.toLowerCase() === primaryColor.toLowerCase();
      return isCatMatch && isColorMatch;
    });
  },
};
