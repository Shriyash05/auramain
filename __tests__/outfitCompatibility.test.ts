import {
  OutfitCompatibilityService,
  OutfitSlots,
} from '../src/services/stylist/outfitCompatibilityService';
import { Garment } from '../src/types/garment';
import { StylingContext } from '../src/types/stylist';

describe('Phase 16 — OutfitCompatibilityService', () => {
  const sampleTop: Garment = {
    id: 'top-1',
    user_id: 'user-1',
    name: 'Relaxed Linen Shirt',
    category: 'tops',
    primary_color: '#FFFFFF',
    fit: 'Oversized',
    occasions: ['Casual', 'Vacation'],
    favorite: false,
    user_verified: true,
    original_image: 'file:///top.jpg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const sampleBottom: Garment = {
    id: 'bot-1',
    user_id: 'user-1',
    name: 'Tailored Wool Trousers',
    category: 'bottoms',
    primary_color: '#111111',
    fit: 'Regular',
    occasions: ['Casual', 'Work / Office'],
    favorite: true,
    user_verified: true,
    original_image: 'file:///bot.jpg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const sampleShoes: Garment = {
    id: 'shoe-1',
    user_id: 'user-1',
    name: 'Minimalist Leather Derby',
    category: 'shoes',
    primary_color: '#1A1A1A',
    fit: 'Regular',
    occasions: ['Casual', 'Work / Office', 'Date Night'],
    favorite: false,
    user_verified: true,
    original_image: 'file:///shoe.jpg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const sampleOuterwear: Garment = {
    id: 'coat-1',
    user_id: 'user-1',
    name: 'Structured Trench Coat',
    category: 'outerwear',
    primary_color: '#8B6D55', // Taupe / Camel neutral
    fit: 'Regular',
    occasions: ['Work / Office', 'Casual'],
    favorite: false,
    user_verified: true,
    original_image: 'file:///coat.jpg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const sampleAccessory: Garment = {
    id: 'acc-1',
    user_id: 'user-1',
    name: 'Leather Woven Belt',
    category: 'accessories',
    primary_color: '#2B2C2E',
    favorite: false,
    user_verified: true,
    original_image: 'file:///acc.jpg',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  describe('1. Wardrobe Sufficiency Checks', () => {
    it('detects completely empty wardrobe with guidance message', () => {
      const result = OutfitCompatibilityService.checkWardrobeSufficiency([]);
      expect(result.isSufficient).toBe(false);
      expect(result.missingCategory).toBe('wardrobe');
      expect(result.guidanceMessage).toContain('Add garments');
    });

    it('detects missing tops', () => {
      const result = OutfitCompatibilityService.checkWardrobeSufficiency([sampleBottom, sampleShoes]);
      expect(result.isSufficient).toBe(false);
      expect(result.missingCategory).toBe('tops');
      expect(result.guidanceMessage).toContain('top');
    });

    it('detects missing bottoms', () => {
      const result = OutfitCompatibilityService.checkWardrobeSufficiency([sampleTop, sampleShoes]);
      expect(result.isSufficient).toBe(false);
      expect(result.missingCategory).toBe('bottoms');
      expect(result.guidanceMessage).toContain('trousers or bottoms');
    });

    it('detects missing shoes', () => {
      const result = OutfitCompatibilityService.checkWardrobeSufficiency([sampleTop, sampleBottom]);
      expect(result.isSufficient).toBe(false);
      expect(result.missingCategory).toBe('shoes');
      expect(result.guidanceMessage).toContain('shoes');
    });

    it('returns sufficient when base categories are present', () => {
      const result = OutfitCompatibilityService.checkWardrobeSufficiency([
        sampleTop,
        sampleBottom,
        sampleShoes,
      ]);
      expect(result.isSufficient).toBe(true);
      expect(result.missingCategory).toBeUndefined();
    });
  });

  describe('2. Complete Outfit Construction & Category Rules', () => {
    it('evaluates complete base outfit as compatible', () => {
      const slots: OutfitSlots = {
        top: sampleTop,
        bottom: sampleBottom,
        shoes: sampleShoes,
      };

      const result = OutfitCompatibilityService.evaluateOutfit(slots);
      expect(result.isValidBase).toBe(true);
      expect(result.rating).toBe('compatible');
      expect(result.missingCategories).toHaveLength(0);
      expect(result.rationale).toContain('Relaxed Linen Shirt');
      expect(result.rationale).toContain('Tailored Wool Trousers');
    });

    it('flags incomplete outfit missing shoes as incompatible', () => {
      const slots: OutfitSlots = {
        top: sampleTop,
        bottom: sampleBottom,
      };

      const result = OutfitCompatibilityService.evaluateOutfit(slots);
      expect(result.isValidBase).toBe(false);
      expect(result.rating).toBe('incompatible');
      expect(result.missingCategories).toContain('shoes');
      expect(result.rationale).toContain('shoes');
    });

    it('gracefully integrates optional outerwear and accessory without requiring them', () => {
      const slotsWithLayers: OutfitSlots = {
        top: sampleTop,
        bottom: sampleBottom,
        shoes: sampleShoes,
        outerwear: sampleOuterwear,
        accessory: sampleAccessory,
      };

      const result = OutfitCompatibilityService.evaluateOutfit(slotsWithLayers);
      expect(result.isValidBase).toBe(true);
      expect(result.rating).toBe('compatible');
      expect(result.highlights).toContain('Editorial Layering');
      expect(result.rationale).toContain('Structured Trench Coat');
    });
  });

  describe('3. Color Compatibility Rules', () => {
    it('rates neutral + neutral pairings as harmonious', () => {
      const evalColor = OutfitCompatibilityService.evaluateColorHarmony([
        sampleTop, // White
        sampleBottom, // Black
        sampleShoes, // Charcoal
      ]);
      expect(evalColor.level).toBe('harmonious');
      expect(evalColor.isNeutralDominant).toBe(true);
      expect(evalColor.accentColors).toHaveLength(0);
    });

    it('rates neutral base + single accent as balanced', () => {
      const accentTop: Garment = {
        ...sampleTop,
        primary_color: '#E63946', // Vibrant Red accent
      };

      const evalColor = OutfitCompatibilityService.evaluateColorHarmony([
        accentTop,
        sampleBottom, // Neutral Black
        sampleShoes, // Neutral Charcoal
      ]);
      expect(evalColor.level).toBe('balanced');
      expect(evalColor.isNeutralDominant).toBe(true);
      expect(evalColor.accentColors).toEqual(['#E63946']);
    });

    it('penalizes multiple strong competing accents as clashing', () => {
      const redTop: Garment = { ...sampleTop, primary_color: '#FF0000' };
      const greenBottom: Garment = { ...sampleBottom, primary_color: '#00FF00' };
      const yellowShoes: Garment = { ...sampleShoes, primary_color: '#FFFF00' };

      const evalColor = OutfitCompatibilityService.evaluateColorHarmony([
        redTop,
        greenBottom,
        yellowShoes,
      ]);
      expect(evalColor.level).toBe('clashing');
      expect(evalColor.accentColors.length).toBeGreaterThanOrEqual(2);

      const outfitResult = OutfitCompatibilityService.evaluateOutfit({
        top: redTop,
        bottom: greenBottom,
        shoes: yellowShoes,
      });
      expect(outfitResult.rating).toBe('acceptable'); // Clashing drops rating from 'compatible'
    });
  });

  describe('4. Silhouette and Proportion Evaluation', () => {
    it('recognizes oversized top + regular bottom as balanced volume contrast', () => {
      const evalProp = OutfitCompatibilityService.evaluateProportions(sampleTop, sampleBottom);
      expect(evalProp.level).toBe('balanced');
      expect(evalProp.reason).toContain('anchored');
    });

    it('recognizes slim top + relaxed bottom as structured contrast', () => {
      const slimTop: Garment = { ...sampleTop, fit: 'Slim' };
      const relaxedBottom: Garment = { ...sampleBottom, fit: 'Relaxed' };
      const evalProp = OutfitCompatibilityService.evaluateProportions(slimTop, relaxedBottom);
      expect(evalProp.level).toBe('structured');
    });

    it('recognizes oversized top + relaxed bottom as relaxed contemporary', () => {
      const relaxedBottom: Garment = { ...sampleBottom, fit: 'Relaxed' };
      const evalProp = OutfitCompatibilityService.evaluateProportions(sampleTop, relaxedBottom);
      expect(evalProp.level).toBe('relaxed');
    });
  });

  describe('5. Occasion & Weather Context', () => {
    it('matches garments explicitly tagged for the requested occasion', () => {
      const occasionEval = OutfitCompatibilityService.evaluateOccasion(
        [sampleTop, sampleBottom, sampleShoes],
        'Casual'
      );
      expect(occasionEval.aligned).toBe(true);
      expect(occasionEval.matchingGarments).toContain(sampleTop.name);
    });

    it('evaluates cool weather suitability with outerwear', () => {
      const weatherEval = OutfitCompatibilityService.evaluateWeather(
        [sampleTop, sampleBottom, sampleShoes, sampleOuterwear],
        { tempF: 52, condition: 'cool' }
      );
      expect(weatherEval.evaluated).toBe(true);
      expect(weatherEval.suitable).toBe(true);
    });

    it('flags unlayered outfit in cold weather without crashing', () => {
      const weatherEval = OutfitCompatibilityService.evaluateWeather(
        [sampleTop, sampleBottom, sampleShoes],
        { tempF: 45, condition: 'cold' }
      );
      expect(weatherEval.evaluated).toBe(true);
      expect(weatherEval.suitable).toBe(false);
      expect(weatherEval.reason).toContain('jacket or coat');
    });

    it('does NOT fabricate weather data when weather is undefined', () => {
      const weatherEval = OutfitCompatibilityService.evaluateWeather([sampleTop, sampleBottom, sampleShoes]);
      expect(weatherEval.evaluated).toBe(false);
      expect(weatherEval.reason).toBe('');
    });
  });

  describe('6. Look Candidate Generation & Real Wardrobe Primacy', () => {
    it('generates up to 3 coherent looks strictly from user wardrobe', () => {
      const wardrobe: Garment[] = [
        sampleTop,
        { ...sampleTop, id: 'top-2', name: 'Silk Knit Polo', fit: 'Regular', primary_color: '#111111' },
        sampleBottom,
        { ...sampleBottom, id: 'bot-2', name: 'Wide Leg Chinos', fit: 'Relaxed', primary_color: '#8B6D55' },
        sampleShoes,
        sampleOuterwear,
      ];

      const context: StylingContext = {
        occasion: 'Casual',
        timeOfDay: 'afternoon',
      };

      const candidates = OutfitCompatibilityService.generateLookCandidates(wardrobe, context);
      expect(candidates.length).toBeGreaterThanOrEqual(1);
      expect(candidates.length).toBeLessThanOrEqual(3);

      // Verify each candidate has real top, bottom, and shoes from wardrobe
      for (const cand of candidates) {
        expect(cand.garments.top).toBeDefined();
        expect(cand.garments.bottom).toBeDefined();
        expect(cand.garments.shoes).toBeDefined();
        expect(cand.rationale).toBeTruthy();
        expect(cand.archetypeLabel).toBeTruthy();
      }
    });

    it('does NOT fabricate candidates if wardrobe is empty or incomplete', () => {
      const candidates = OutfitCompatibilityService.generateLookCandidates([], { occasion: 'Casual' });
      expect(candidates).toEqual([]);
    });
  });

  describe('7. Refused / Incomplete Garment Attributes', () => {
    it('handles garment with missing/refused color and fit safely', () => {
      const refusedGarment: Garment = {
        id: 'refused-1',
        user_id: 'user-1',
        name: 'Uncertain Garment',
        category: 'tops',
        primary_color: '', // Missing
        fit: undefined, // Missing
        favorite: false,
        user_verified: false,
        original_image: 'file:///refused.jpg',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      const result = OutfitCompatibilityService.evaluateOutfit({
        top: refusedGarment,
        bottom: sampleBottom,
        shoes: sampleShoes,
      });

      expect(result.isValidBase).toBe(true);
      expect(result.rating).toBe('compatible');
      expect(result.rationale).toContain('Uncertain Garment');
    });
  });
});
