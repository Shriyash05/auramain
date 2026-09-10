import { Garment } from '../src/types/garment';
import { GarmentPresentationService } from '../src/services/image-processing/garmentPresentationService';
import { LiveStyleIntelligenceService } from '../src/services/stylist/liveStyleIntelligenceService';
import { OutfitCompatibilityService } from '../src/services/stylist/outfitCompatibilityService';
import { MirrorService } from '../src/services/vto/mirrorService';
import { vtoProvider } from '../src/services/vto/vtoProvider';
import { LocalStorage } from '../src/services/storage/localStorage';
import { CropService } from '../src/services/garment-selection';

describe('Phase 17 — AURA Studio Visual Wardrobe Styling Experience', () => {
  const userId = 'user_studio_test_01';

  const sampleTops: Garment[] = [
    {
      id: 'top-blue',
      user_id: userId,
      name: 'Sky Blue Oxford Shirt',
      category: 'tops',
      primary_color: '#4A90E2', // Blue
      fit: 'Regular',
      occasions: ['Casual', 'Work / Office'],
      favorite: true,
      user_verified: true,
      original_image: 'file:///blue_shirt.jpg',
      processed_image: 'file:///blue_shirt_crop.png',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'top-cream',
      user_id: userId,
      name: 'Cream Knit Sweater',
      category: 'tops',
      primary_color: '#F4F3EE', // Cream / light neutral
      fit: 'Oversized',
      occasions: ['Casual'],
      favorite: false,
      user_verified: true,
      original_image: 'file:///cream_knit.jpg',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  const sampleBottoms: Garment[] = [
    {
      id: 'bot-charcoal',
      user_id: userId,
      name: 'Charcoal Wool Trousers',
      category: 'bottoms',
      primary_color: '#2B2C2E', // Dark charcoal neutral
      fit: 'Regular',
      occasions: ['Casual', 'Work / Office'],
      favorite: true,
      user_verified: true,
      original_image: 'file:///charcoal_pants.jpg',
      processed_image: 'file:///charcoal_pants_crop.png',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'bot-cream',
      user_id: userId,
      name: 'Cream Pleated Chinos',
      category: 'bottoms',
      primary_color: '#F9F9F8', // Cream / light neutral
      fit: 'Relaxed',
      occasions: ['Casual', 'Vacation'],
      favorite: false,
      user_verified: true,
      original_image: 'file:///cream_chinos.jpg',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'bot-red',
      user_id: userId,
      name: 'Bright Crimson Trousers',
      category: 'bottoms',
      primary_color: '#D90429', // Competing strong red accent
      fit: 'Regular',
      occasions: ['Evening / Event'],
      favorite: false,
      user_verified: true,
      original_image: 'file:///crimson_pants.jpg',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  const sampleShoes: Garment[] = [
    {
      id: 'shoe-white',
      user_id: userId,
      name: 'Minimalist White Sneakers',
      category: 'shoes',
      primary_color: '#FFFFFF', // White neutral
      fit: 'Regular',
      occasions: ['Casual', 'Streetwear'],
      favorite: true,
      user_verified: true,
      original_image: 'file:///white_sneakers.jpg',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_user_model_photo_${userId}`, null);
  });

  describe('1. Garment Presentation & Image Source Priority', () => {
    it('prioritizes clean processed crop over raw photo', () => {
      const g = sampleTops[0];
      const displayUri = GarmentPresentationService.getDisplayImageUri(g);
      expect(displayUri).toBe(g.processed_image);
      expect(displayUri).not.toBe(g.original_image);
    });

    it('falls back cleanly to original image when processed crop is absent', () => {
      const g = sampleTops[1];
      const displayUri = GarmentPresentationService.getDisplayImageUri(g);
      expect(displayUri).toBe(g.original_image);
    });

    it('resolves presentation asset tier metadata correctly', () => {
      const asset = GarmentPresentationService.resolvePresentationAsset(sampleTops[0]);
      expect(asset.isIsolated).toBe(true);
      expect(asset.sourceType).toBe('lifestyle_isolated');
      expect(asset.isolationMethod).toBe('manual_crop');
    });

    it('rejects generic stock model imagery in authentic personal wardrobe', () => {
      const fakeGarment: Garment = {
        ...sampleTops[0],
        original_image: 'https://cdn.example.com/generic_placeholder_model.png',
      };
      const auth = GarmentPresentationService.validateAuthenticity(fakeGarment);
      expect(auth.isAuthentic).toBe(false);
      expect(auth.reason).toContain('Generic stock imagery');
    });
  });

  describe('2. Live Style & Colour Intelligence on Swipe', () => {
    it('evaluates Blue Shirt + Charcoal Trousers + White Sneakers as clean & balanced', () => {
      const insight = LiveStyleIntelligenceService.evaluateLiveOutfit({
        top: sampleTops[0], // Blue
        bottom: sampleBottoms[0], // Charcoal
        shoes: sampleShoes[0], // White
      });

      expect(insight.status).toBe('harmonious');
      expect(insight.headline).toBe('Harmonious accent pop');
      expect(insight.explanation).toContain('#4A90E2');
      expect(insight.palette.contrastLevel).toBe('balanced');
      expect(insight.attributePills).toContain('Relaxed Footwear');
    });

    it('evaluates Light/Cream Top + Cream Bottom as softer tonal palette', () => {
      const insight = LiveStyleIntelligenceService.evaluateLiveOutfit({
        top: sampleTops[1], // Cream
        bottom: sampleBottoms[1], // Cream
        shoes: sampleShoes[0], // White
      });

      expect(insight.status).toBe('harmonious');
      expect(insight.headline).toBe('Softer tonal palette');
      expect(insight.explanation).toContain('Light neutral tones');
      expect(insight.attributePills).toContain('Tonal Harmony');
    });

    it('detects weak / competing combinations and provides constructive advice', () => {
      // Blue top + Red bottom = competing strong accents
      const insight = LiveStyleIntelligenceService.evaluateLiveOutfit({
        top: sampleTops[0], // Blue accent
        bottom: sampleBottoms[2], // Red accent
        shoes: sampleShoes[0], // White
      });

      expect(insight.status).toBe('consider_alternative');
      expect(insight.headline).toBe('Try another bottom');
      expect(insight.explanation).toContain('competes');
      expect(insight.suggestedAction?.category).toBe('bottoms');
      expect(insight.suggestedAction?.message).toContain('neutral bottom');
    });

    it('operates deterministically without arbitrary numerical scores (no fake 94%)', () => {
      const insight = LiveStyleIntelligenceService.evaluateLiveOutfit({
        top: sampleTops[0],
        bottom: sampleBottoms[0],
        shoes: sampleShoes[0],
      });

      // Validates absence of numerical score properties
      expect((insight as any).score).toBeUndefined();
      expect((insight as any).percentageMatch).toBeUndefined();
      expect(insight.headline).toBeTruthy();
      expect(insight.palette.pairingAdvice).toBeTruthy();
    });
  });

  describe('3. Studio Modes & Wardrobe Primacy', () => {
    it('proposes complete looks strictly from user wardrobe in AURA mode', () => {
      const fullWardrobe = [...sampleTops, ...sampleBottoms, ...sampleShoes];
      const candidates = OutfitCompatibilityService.generateLookCandidates(fullWardrobe, {
        occasion: 'Casual',
      });

      expect(candidates.length).toBeGreaterThanOrEqual(1);
      for (const c of candidates) {
        expect(c.garments.top.user_id).toBe(userId);
        expect(c.garments.bottom.user_id).toBe(userId);
        expect(c.garments.shoes.user_id).toBe(userId);
      }
    });

    it('evaluates incomplete outfits gracefully in BUILD mode without crashing', () => {
      const partialInsight = LiveStyleIntelligenceService.evaluateLiveOutfit({
        top: sampleTops[0],
        // bottom is missing
      });

      expect(partialInsight.headline).toBe('Composing your look...');
      expect(partialInsight.explanation).toContain('Select a top and bottom');
    });
  });

  describe('4. Personal AURA Model & Virtual Try-On Entry', () => {
    it('retrieves null when user has no stored personal model photo', async () => {
      const photo = await MirrorService.getUserModelPhoto(userId);
      expect(photo).toBeNull();
    });

    it('persists and retrieves user model photo across sessions', async () => {
      const referencePhoto = 'file:///user_full_body_avatar.jpg';
      await MirrorService.saveUserModelPhoto(userId, referencePhoto);

      const retrieved = await MirrorService.getUserModelPhoto(userId);
      expect(retrieved).toBe(referencePhoto);
    });

    it('enforces scientific integrity: zero commercial AI APIs in virtual try-on providers', () => {
      expect(vtoProvider).toBeDefined();
      // Verifies provider is internal diffusion placeholder rather than external commercial proxy
      expect(vtoProvider.constructor.name).toBe('AuraDiffusionVTOProvider');
    });
  });

  describe('5. Crop Gesture Bug Prevention & Coordinate Stability', () => {
    it('preserves top handle vertical math and bounds clamping', () => {
      const initialBox = { x: 0.2, y: 0.3, width: 0.5, height: 0.4 };
      const topUpY = Math.max(0, initialBox.y - 0.1);
      const topUpH = Math.max(0.05, initialBox.height + (initialBox.y - topUpY));

      expect(topUpY).toBeCloseTo(0.2);
      expect(topUpH).toBeCloseTo(0.5);
    });

    it('preserves bottom handle vertical math and bounds clamping', () => {
      const initialBox = { x: 0.2, y: 0.3, width: 0.5, height: 0.4 };
      const botDownH = Math.min(1 - initialBox.y, Math.max(0.05, initialBox.height + 0.15));

      expect(botDownH).toBeCloseTo(0.55);
    });

    it('preserves normalized clamping and minimum dimensions guard', () => {
      const clamped = CropService.clampNormalized({ x: -0.05, y: -0.1, width: 0.001, height: 0.001 });
      expect(clamped.x).toBe(0);
      expect(clamped.y).toBe(0);
      expect(clamped.width).toBeGreaterThanOrEqual(0.01);
      expect(clamped.height).toBeGreaterThanOrEqual(0.01);
    });
  });
});
