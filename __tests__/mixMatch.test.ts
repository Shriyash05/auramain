import { Garment } from '../src/types/garment';
import { DatabaseService } from '../src/services/database/databaseService';
import { LocalStorage } from '../src/services/storage/localStorage';
import { OutfitCompatibilityService } from '../src/services/stylist/outfitCompatibilityService';

describe('Mix & Match Flow', () => {
  const userId = 'user_stylist_01';

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_garments_${userId}`, []);
    await LocalStorage.setItem(`aura_outfits_${userId}`, []);
  });

  it('composes an outfit from distinct garment categories and persists the look', async () => {
    // 1. Ingest garments
    const top = await DatabaseService.addGarment({
      user_id: userId,
      name: 'Oversized Blazer',
      category: 'outerwear',
      original_image: 'file:///top.jpg',
      primary_color: '#1A1A1A',
      fit: 'Oversized',
      favorite: true,
      user_verified: true,
    });

    const bottom = await DatabaseService.addGarment({
      user_id: userId,
      name: 'Wide-Leg Trousers',
      category: 'bottoms',
      original_image: 'file:///bottom.jpg',
      primary_color: '#2A2A2A',
      fit: 'Relaxed',
      favorite: false,
      user_verified: true,
    });

    const shoes = await DatabaseService.addGarment({
      user_id: userId,
      name: 'Leather Loafers',
      category: 'shoes',
      original_image: 'file:///shoes.jpg',
      primary_color: '#000000',
      fit: 'Regular',
      favorite: true,
      user_verified: true,
    });

    // 2. Compose outfit
    const outfit = await DatabaseService.saveOutfit({
      user_id: userId,
      name: 'Tailored Streetwear',
      source: 'mix_match',
      garment_ids: [top.id, bottom.id, shoes.id],
      garments_map: {
        outerwear_id: top.id,
        bottom_id: bottom.id,
        shoes_id: shoes.id,
      },
      favorite: true,
    });

    expect(outfit.id).toBeDefined();
    expect(outfit.garment_ids.length).toBe(3);

    // 3. Verify retrieved outfit contains garment references
    const savedOutfits = await DatabaseService.getOutfits(userId);
    expect(savedOutfits.length).toBe(1);
    expect(savedOutfits[0].garments_map?.bottom_id).toBe(bottom.id);
  });

  describe('Phase 16C — Complete Look & Outfit Stylist Primacy', () => {
    const sampleWardrobe: Garment[] = [
      {
        id: 'top-minimal',
        user_id: userId,
        name: 'Oversized Silk Shirt',
        category: 'tops',
        primary_color: '#FFFFFF',
        fit: 'Oversized',
        occasions: ['Casual', 'Minimalist'],
        favorite: true,
        user_verified: true,
        original_image: 'file:///top1.jpg',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'top-relaxed',
        user_id: userId,
        name: 'Heavyweight Cotton Tee',
        category: 'tops',
        primary_color: '#111111',
        fit: 'Relaxed',
        occasions: ['Casual', 'Streetwear'],
        favorite: false,
        user_verified: true,
        original_image: 'file:///top2.jpg',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'bot-minimal',
        user_id: userId,
        name: 'Tailored Wide Trousers',
        category: 'bottoms',
        primary_color: '#1A1A1A',
        fit: 'Regular',
        occasions: ['Casual', 'Work / Office'],
        favorite: true,
        user_verified: true,
        original_image: 'file:///bot1.jpg',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'bot-relaxed',
        user_id: userId,
        name: 'Raw Denim Jeans',
        category: 'bottoms',
        primary_color: '#2C3E50',
        fit: 'Relaxed',
        occasions: ['Casual', 'Streetwear'],
        favorite: false,
        user_verified: true,
        original_image: 'file:///bot2.jpg',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'shoe-minimal',
        user_id: userId,
        name: 'Leather Penny Loafers',
        category: 'shoes',
        primary_color: '#000000',
        fit: 'Regular',
        occasions: ['Casual', 'Work / Office'],
        favorite: true,
        user_verified: true,
        original_image: 'file:///shoe1.jpg',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'shoe-relaxed',
        user_id: userId,
        name: 'Retro Canvas Sneakers',
        category: 'shoes',
        primary_color: '#F4F3EE',
        fit: 'Regular',
        occasions: ['Casual', 'Streetwear'],
        favorite: false,
        user_verified: true,
        original_image: 'file:///shoe2.jpg',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];

    it('generates complete looks where every piece originates strictly from user wardrobe', () => {
      const candidates = OutfitCompatibilityService.generateLookCandidates(sampleWardrobe, {
        occasion: 'Casual',
      });

      expect(candidates.length).toBeGreaterThanOrEqual(1);

      const knownIds = new Set(sampleWardrobe.map((g) => g.id));
      for (const cand of candidates) {
        expect(knownIds.has(cand.garments.top.id)).toBe(true);
        expect(knownIds.has(cand.garments.bottom.id)).toBe(true);
        expect(knownIds.has(cand.garments.shoes.id)).toBe(true);
        // Zero fabricated or generic internet garments
        expect(cand.garments.top.user_id).toBe(userId);
      }
    });

    it('supports alternative complete looks (LOOK 01, LOOK 02, LOOK 03) with distinct archetypes', () => {
      const candidates = OutfitCompatibilityService.generateLookCandidates(sampleWardrobe, {
        occasion: 'Casual',
      });

      expect(candidates.length).toBeGreaterThanOrEqual(2);
      expect(candidates[0].archetypeLabel).toBeDefined();
      expect(candidates[1].archetypeLabel).toBeDefined();
      // Ensure different looks feature different styling combinations
      const look1Ids = [candidates[0].garments.top.id, candidates[0].garments.bottom.id].join('-');
      const look2Ids = [candidates[1].garments.top.id, candidates[1].garments.bottom.id].join('-');
      expect(look1Ids).not.toBe(look2Ids);
    });

    it('recomputes qualitative styling rationale immediately when swapping a piece', () => {
      const initialOutfit = {
        top: sampleWardrobe[0], // Oversized Silk Shirt
        bottom: sampleWardrobe[2], // Tailored Wide Trousers
        shoes: sampleWardrobe[4], // Leather Penny Loafers
      };

      const eval1 = OutfitCompatibilityService.evaluateOutfit(initialOutfit);
      expect(eval1.rationale).toContain('Oversized Silk Shirt');

      // User swaps top to Heavyweight Cotton Tee
      const updatedOutfit = {
        ...initialOutfit,
        top: sampleWardrobe[1], // Heavyweight Cotton Tee
      };

      const eval2 = OutfitCompatibilityService.evaluateOutfit(updatedOutfit);
      expect(eval2.rationale).toContain('Heavyweight Cotton Tee');
      expect(eval2.rationale).not.toContain('Oversized Silk Shirt');
    });

    it('handles sparse wardrobe by refusing to fabricate missing pieces and giving guidance', () => {
      const sparseWardrobe = [sampleWardrobe[0], sampleWardrobe[2]]; // Tops and Bottoms only, NO shoes
      const sufficiency = OutfitCompatibilityService.checkWardrobeSufficiency(sparseWardrobe);

      expect(sufficiency.isSufficient).toBe(false);
      expect(sufficiency.missingCategory).toBe('shoes');
      expect(sufficiency.guidanceMessage).toContain('shoes');

      const candidates = OutfitCompatibilityService.generateLookCandidates(sparseWardrobe, {
        occasion: 'Casual',
      });
      expect(candidates).toEqual([]);
    });

    it('honors context handling: uses genuine weather/occasion when available without inventing', () => {

      // Context with genuine weather
      const weatherContext = {
        tempF: 75,
        condition: 'warm' as const,
      };
      const evalWithWeather = OutfitCompatibilityService.evaluateWeather(
        [sampleWardrobe[0], sampleWardrobe[2], sampleWardrobe[4]],
        weatherContext
      );
      expect(evalWithWeather.evaluated).toBe(true);
      expect(evalWithWeather.suitable).toBe(true);

      // Context with NO weather
      const evalWithoutWeather = OutfitCompatibilityService.evaluateWeather([
        sampleWardrobe[0],
        sampleWardrobe[2],
        sampleWardrobe[4],
      ]);
      expect(evalWithoutWeather.evaluated).toBe(false);
      expect(evalWithoutWeather.reason).toBe('');
    });
  });
});
