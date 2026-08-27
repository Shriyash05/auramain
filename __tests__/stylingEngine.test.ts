import { StylingEngine } from '../src/services/stylist/stylingEngine';
import { Garment } from '../src/types/garment';
import { StylingContext } from '../src/types/stylist';
import { LocalStorage } from '../src/services/storage/localStorage';

describe('StylingEngine', () => {
  const userId = 'user_stylist_test';

  const mockWardrobe: Garment[] = [
    {
      id: 'top_shirt',
      user_id: userId,
      name: 'Oversized Silk Oxford',
      category: 'tops',
      original_image: 'file:///top1.jpg',
      primary_color: '#F0EFEA',
      fit: 'Oversized',
      occasions: ['Casual', 'Date Night'],
      favorite: false,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'top_tee',
      user_id: userId,
      name: 'Heavy Cotton Tee',
      category: 'tops',
      original_image: 'file:///top2.jpg',
      primary_color: '#111111',
      fit: 'Relaxed',
      occasions: ['Casual', 'Streetwear'],
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'bottom_pants',
      user_id: userId,
      name: 'Wide-Leg Trousers',
      category: 'bottoms',
      original_image: 'file:///bot1.jpg',
      primary_color: '#2B2C2E',
      fit: 'Relaxed',
      occasions: ['Date Night', 'Work / Office'],
      favorite: false,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'shoes_loafers',
      user_id: userId,
      name: 'Leather Loafers',
      category: 'shoes',
      original_image: 'file:///shoes1.jpg',
      primary_color: '#111111',
      fit: 'Regular',
      occasions: ['Date Night', 'Work / Office'],
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'coat_wool',
      user_id: userId,
      name: 'Structured Trench Coat',
      category: 'outerwear',
      original_image: 'file:///coat1.jpg',
      primary_color: '#2A2927',
      fit: 'Oversized',
      occasions: ['Date Night', 'Evening / Event'],
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await LocalStorage.removeItem(`aura_pref_signals_${userId}`);
  });

  it('generates recommendations composed strictly from user wardrobe', async () => {
    const context: StylingContext = {
      occasion: 'Date Night',
      mood: 'Elegant',
    };

    const recommendations = await StylingEngine.generateRecommendations(userId, mockWardrobe, context);

    expect(recommendations.length).toBeGreaterThan(0);
    const firstLook = recommendations[0];

    // Verify top, bottom, and shoes come strictly from user wardrobe
    expect(mockWardrobe.map((g) => g.id)).toContain(firstLook.garments.top.id);
    expect(mockWardrobe.map((g) => g.id)).toContain(firstLook.garments.bottom.id);
    expect(mockWardrobe.map((g) => g.id)).toContain(firstLook.garments.shoes.id);

    // Verify concise rationale is generated
    expect(firstLook.rationale).toBeDefined();
    expect(firstLook.rationale.length).toBeGreaterThan(10);
  });

  it('prioritizes looks matching the requested occasion', async () => {
    const context: StylingContext = {
      occasion: 'Date Night',
      mood: 'Elegant',
    };

    const recommendations = await StylingEngine.generateRecommendations(userId, mockWardrobe, context);
    const topLook = recommendations[0];

    // Date night occasion garments should be ranked highest
    expect(topLook.garments.bottom.id).toBe('bottom_pants');
  });

  it('gracefully returns empty array for empty wardrobe', async () => {
    const context: StylingContext = { occasion: 'Casual' };
    const emptyRecs = await StylingEngine.generateRecommendations(userId, [], context);
    expect(emptyRecs).toEqual([]);
  });
});
