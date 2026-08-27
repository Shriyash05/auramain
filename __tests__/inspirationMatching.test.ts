import { InspirationMatchingService } from '../src/services/inspiration/inspirationMatchingService';
import { InspirationService } from '../src/services/inspiration/inspirationService';
import { DatabaseService } from '../src/services/database/databaseService';
import { LocalStorage } from '../src/services/storage/localStorage';
import { Garment } from '../src/types/garment';
import { ExtractedPiece } from '../src/types/inspiration';

describe('InspirationMatchingService & InspirationService', () => {
  const userId = 'user_insp_test_99';

  const mockWardrobe: Garment[] = [
    {
      id: 'garm_top_exact',
      user_id: userId,
      name: 'Cream Oversized Shirt',
      category: 'tops',
      original_image: 'file:///cream_top.jpg',
      primary_color: '#F0EFEA',
      fit: 'Oversized',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'garm_bot_close',
      user_id: userId,
      name: 'Charcoal Trousers',
      category: 'bottoms',
      original_image: 'file:///charcoal_pants.jpg',
      primary_color: '#2B2C2E',
      fit: 'Relaxed',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_garments_${userId}`, mockWardrobe);
    await LocalStorage.setItem(`aura_outfits_${userId}`, []);
    await LocalStorage.removeItem(`aura_inspirations_${userId}`);
  });

  it('matches inspiration pieces accurately and detects missing categories honestly', () => {
    const extractedPieces: ExtractedPiece[] = [
      {
        category: 'tops',
        item_description: 'Cream shirt',
        color: '#F0EFEA',
        fit: 'Oversized',
      },
      {
        category: 'bottoms',
        item_description: 'Dark trousers',
        color: '#2B2C2E',
        fit: 'Relaxed',
      },
      {
        category: 'shoes',
        item_description: 'Leather boots',
        color: '#111111',
      },
    ];

    const matched = InspirationMatchingService.matchPieces(extractedPieces, mockWardrobe);

    expect(matched.length).toBe(3);

    // Top should be exact match
    const topMatch = matched.find((m) => m.target_piece_category === 'tops');
    expect(topMatch?.match_quality).toBe('exact');
    expect(topMatch?.user_garment_id).toBe('garm_top_exact');

    // Bottom should be exact/close match
    const botMatch = matched.find((m) => m.target_piece_category === 'bottoms');
    expect(botMatch?.user_garment_id).toBe('garm_bot_close');

    // Shoes should be reported as missing in closet (user owns no shoes)
    const shoeMatch = matched.find((m) => m.target_piece_category === 'shoes');
    expect(shoeMatch?.match_quality).toBe('missing');
    expect(shoeMatch?.user_garment_id).toBeUndefined();
  });

  it('creates inspiration, recreates AURA version, and saves as outfit', async () => {
    const created = await InspirationService.createInspiration(userId, 'file:///inspo.jpg', 'gallery');

    expect(created.id).toBeDefined();
    expect(created.matched_pieces.length).toBeGreaterThan(0);

    const savedOutfit = await InspirationService.saveAuraVersionAsOutfit(userId, created.id);
    expect(savedOutfit.id).toBeDefined();
    expect(savedOutfit.source).toBe('inspiration');
    expect(savedOutfit.garment_ids).toContain('garm_top_exact');
  });
});
