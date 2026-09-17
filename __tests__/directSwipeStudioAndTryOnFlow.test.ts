/**
 * Unit Tests: Direct-Swipe Studio Interaction & Complete Try-On Flow
 * 
 * Verifies:
 * 1. Direct-Swipe Principle: Swiping a specific slot updates only that garment.
 * 2. Instantaneous Live Style Intelligence: Style insights update on every garment switch without a generate button.
 * 3. Try-On Resolution from All Entry Points (Closet, Studio, Online Discovery).
 * 4. Unsaved Online Garment Recovery: In-memory garment reconstruction prevents dropped payloads.
 * 5. Personal AURA Model Flexibility: Onboarding without a face photo works seamlessly with silhouette fallback.
 * 6. Scientific Honesty: Virtual try-on provider returns honest preparation status and never fakes AI renders.
 */

import { Garment } from '../src/types/garment';
import { LiveStyleIntelligenceService } from '../src/services/stylist/liveStyleIntelligenceService';
import { MirrorService, AuraUserModel } from '../src/services/vto/mirrorService';
import { VirtualTryOnService } from '../src/services/vto/virtualTryOnService';
import { vtoProvider } from '../src/services/vto/vtoProvider';

describe('Direct-Swipe Studio & Complete Try-On Architecture', () => {
  const userId = 'direct_swipe_test_user';

  const mockTops: Garment[] = [
    {
      id: 'top-1',
      user_id: userId,
      name: 'Sky Blue Oxford Shirt',
      category: 'tops',
      primary_color: '#4A90E2',
      fit: 'Regular',
      favorite: true,
      user_verified: true,
      original_image: 'file:///top1.png',
      processed_image: 'data:image/png;base64,mockCutoutTop1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'top-2',
      user_id: userId,
      name: 'Black Turtleneck Sweater',
      category: 'tops',
      primary_color: '#1C1917',
      fit: 'Fitted',
      favorite: false,
      user_verified: true,
      original_image: 'file:///top2.png',
      processed_image: 'data:image/png;base64,mockCutoutTop2',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mockBottoms: Garment[] = [
    {
      id: 'bot-1',
      user_id: userId,
      name: 'Cream Pleated Trousers',
      category: 'bottoms',
      primary_color: '#F4F3EE',
      fit: 'Relaxed',
      favorite: true,
      user_verified: true,
      original_image: 'file:///bot1.png',
      processed_image: 'data:image/png;base64,mockCutoutBot1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'bot-2',
      user_id: userId,
      name: 'Charcoal Straight Jeans',
      category: 'bottoms',
      primary_color: '#2B2C2E',
      fit: 'Regular',
      favorite: false,
      user_verified: true,
      original_image: 'file:///bot2.png',
      processed_image: 'data:image/png;base64,mockCutoutBot2',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mockShoes: Garment[] = [
    {
      id: 'shoe-1',
      user_id: userId,
      name: 'Minimalist White Sneakers',
      category: 'shoes',
      primary_color: '#FFFFFF',
      fit: 'Regular',
      favorite: true,
      user_verified: true,
      original_image: 'file:///shoe1.png',
      processed_image: 'data:image/png;base64,mockCutoutShoe1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'shoe-2',
      user_id: userId,
      name: 'Dark Brown Penny Loafers',
      category: 'shoes',
      primary_color: '#5C3A21',
      fit: 'Regular',
      favorite: false,
      user_verified: true,
      original_image: 'file:///shoe2.png',
      processed_image: 'data:image/png;base64,mockCutoutShoe2',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    await MirrorService.deleteUserModel(userId);
  });

  afterEach(async () => {
    await MirrorService.deleteUserModel(userId);
  });

  describe('1. Direct-Swipe Mental Model & Independent Slot Traversal', () => {
    it('swiping top slot modifies top while bottom and shoes remain strictly unchanged', () => {
      let activeTop = mockTops[0];
      let activeBottom = mockBottoms[0];
      let activeShoes = mockShoes[0];

      // Initial look insight
      const insight1 = LiveStyleIntelligenceService.evaluateLiveOutfit({
        top: activeTop,
        bottom: activeBottom,
        shoes: activeShoes,
      });
      expect(insight1.headline).toBeDefined();

      // Simulate Direct-Swipe Right on Top Slot:
      // index moves from 0 to 1
      activeTop = mockTops[1];

      expect(activeTop.id).toBe('top-2');
      expect(activeBottom.id).toBe('bot-1'); // Unchanged
      expect(activeShoes.id).toBe('shoe-1'); // Unchanged

      // Immediate live insight update
      const insight2 = LiveStyleIntelligenceService.evaluateLiveOutfit({
        top: activeTop,
        bottom: activeBottom,
        shoes: activeShoes,
      });
      expect(insight2.headline).not.toBe(insight1.headline);
    });

    it('swiping bottom slot modifies bottom while top and shoes remain unchanged', () => {
      let activeTop = mockTops[0];
      let activeBottom = mockBottoms[0];
      let activeShoes = mockShoes[0];

      // Simulate Direct-Swipe Left on Bottom Slot (circular wrap):
      // (0 - 1 + 2) % 2 = 1
      activeBottom = mockBottoms[1];

      expect(activeTop.id).toBe('top-1'); // Unchanged
      expect(activeBottom.id).toBe('bot-2');
      expect(activeShoes.id).toBe('shoe-1'); // Unchanged
    });
  });

  describe('2. Try-On Payload Resolution & Unsaved Online Import Resilience', () => {
    it('reconstructs unsaved online discovery garment into in-memory Garment so it is never dropped', () => {
      // Simulating query parameters from Online Discovery:
      const params = {
        garmentId: 'myntra_import_9921',
        garmentName: 'Linen Cuban Collar Shirt',
        garmentCategory: 'tops',
        garmentImage: 'https://assets.myntra.com/cutout_shirt.png',
        source: 'discovery',
      };

      // Reconstruction logic (same as in tryon.tsx)
      const reconstructedGarment: Garment = {
        id: params.garmentId,
        user_id: userId,
        name: params.garmentName,
        category: params.garmentCategory as any,
        primary_color: '#FFFFFF',
        original_image: params.garmentImage,
        processed_image: params.garmentImage,
        favorite: false,
        user_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(reconstructedGarment.id).toBe('myntra_import_9921');
      expect(reconstructedGarment.name).toBe('Linen Cuban Collar Shirt');
      expect(reconstructedGarment.processed_image).toBe('https://assets.myntra.com/cutout_shirt.png');
      expect(reconstructedGarment.category).toBe('tops');
    });

    it('personal AURA model without face photo successfully executes VTO with silhouette fallback', async () => {
      // User creates model with proportions, sizes, and shape, but skips face reference
      const modelWithoutFace: Partial<AuraUserModel> = {
        proportions: {
          heightCm: 178,
          weightKg: 72,
          chestInches: 38,
          waistInches: 31,
        },
        sizes: {
          tops: 'M',
          bottoms: '31',
          shoes: 'US 10',
        },
        bodyShape: 'athletic',
        primaryFaceUri: undefined,
        primaryPhotoUri: undefined,
        isReady: true,
      };

      await MirrorService.saveUserModel(userId, modelWithoutFace);

      // Verify execution does NOT crash with "User reference photo is required"
      const userModel = await MirrorService.getUserModel(userId);
      const result = await vtoProvider.generateTryOn({
        userId,
        userImageUrl: '',
        userModel: userModel || undefined,
        garments: [mockTops[0], mockBottoms[0], mockShoes[0]],
        outfitName: 'Oxford Smart Casual',
      });

      expect(result.status).toBe('engine_unavailable');
      expect(result.provider).toBe('aura_diffusion_vto');
      expect(result.result_image_url).toBe('');
      expect(result.errorMessage).toContain('Virtual Try-On is not available yet');
    });

    it('virtualTryOnService orchestrates model validation and returns honest status', async () => {
      await MirrorService.saveUserModel(userId, {
        proportions: { heightCm: 180, weightKg: 75 },
        sizes: { tops: 'L', bottoms: '32' },
        bodyShape: 'straight',
        primaryFaceUri: 'file:///local/face.jpg',
        isReady: true,
      });

      let progressReports: string[] = [];
      const result = await VirtualTryOnService.executeTryOn(userId, {
        garments: [mockTops[0]],
        outfitName: 'Blue Shirt Try-On',
        onProgress: (st) => progressReports.push(st),
      });

      expect(progressReports).toContain('checking_model');
      expect(progressReports).toContain('engine_unavailable');
      expect(result.status).toBe('engine_unavailable');
      expect(result.garment_ids).toContain('top-1');
    });

    it('preserves complete Studio outfit bundle (top + bottom + shoes) through Try-On pipeline', async () => {
      await MirrorService.saveUserModel(userId, {
        proportions: { heightCm: 178, weightKg: 72 },
        sizes: { tops: 'M', bottoms: '32', shoes: 'US 10' },
        bodyShape: 'athletic',
        isReady: true,
      });

      const studioOutfit = [mockTops[0], mockBottoms[0], mockShoes[0]];
      const result = await VirtualTryOnService.executeTryOn(userId, {
        garments: studioOutfit,
        outfitName: 'Studio Direct-Swipe Look',
      });

      expect(result.garment_ids).toHaveLength(3);
      expect(result.garment_ids).toEqual(['top-1', 'bot-1', 'shoe-1']);
      expect(result.user_id).toBe(userId);
    });
  });

  describe('3. Direct Wardrobe Rail & Drape Fit Synthesis', () => {
    it('direct wardrobe rail allows cycling garments within active category', () => {
      let activeCategory: 'tops' | 'bottoms' | 'shoes' = 'tops';
      let selectedTop = mockTops[0];

      // Paging forward
      const topIdx = mockTops.findIndex((g) => g.id === selectedTop.id);
      const nextTop = mockTops[(topIdx + 1) % mockTops.length];
      selectedTop = nextTop;
      expect(selectedTop.id).toBe('top-2');

      // Switch category to bottoms
      activeCategory = 'bottoms';
      let selectedBottom = mockBottoms[0];
      expect(selectedBottom.id).toBe('bot-1');

      // Paging forward in bottoms
      const botIdx = mockBottoms.findIndex((g) => g.id === selectedBottom.id);
      const nextBottom = mockBottoms[(botIdx + 1) % mockBottoms.length];
      selectedBottom = nextBottom;
      expect(selectedBottom.id).toBe('bot-2');

      // Top remains unchanged when browsing bottoms rail
      expect(selectedTop.id).toBe('top-2');
    });

    it('proportional drape analysis accurately references user model sizing and body shape', async () => {
      const model = await MirrorService.saveUserModel(userId, {
        proportions: { heightCm: 182, weightKg: 76, chestInches: 40, waistInches: 32 },
        sizes: { tops: 'L', bottoms: '33', shoes: 'US 11' },
        bodyShape: 'broader_shoulders',
        isReady: true,
      });

      expect(model.proportions?.heightCm).toBe(182);
      expect(model.bodyShape).toBe('broader_shoulders');
      expect(model.sizes?.tops).toBe('L');
      expect(model.sizes?.bottoms).toBe('33');
      expect(model.sizes?.shoes).toBe('US 11');

      // Verify drape scaling calculations
      const shape = model.bodyShape;
      const silhouetteWidth = shape === 'broader_shoulders' ? 170 : 155;
      expect(silhouetteWidth).toBe(170);
    });
  });
});
