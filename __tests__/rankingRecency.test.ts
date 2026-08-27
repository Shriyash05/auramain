import { StylingEngine } from '../src/services/stylist/stylingEngine';
import { Garment } from '../src/types/garment';
import { StylingContext } from '../src/types/stylist';
import { LocalStorage } from '../src/services/storage/localStorage';

describe('StylingEngine Recency & Wear Memory Ranking', () => {
  const userId = 'user_recency_test';

  const mockWardrobe: Garment[] = [
    {
      id: 'top_worn_yesterday',
      user_id: userId,
      name: 'Black Crewneck (Worn Yesterday)',
      category: 'tops',
      original_image: 'file:///top1.jpg',
      primary_color: '#111111',
      fit: 'Relaxed',
      occasions: ['Casual'],
      last_worn: new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0], // Worn yesterday
      wear_count: 5,
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'top_unworn_fresh',
      user_id: userId,
      name: 'Cream Knit (Unworn Fresh)',
      category: 'tops',
      original_image: 'file:///top2.jpg',
      primary_color: '#F0EFEA',
      fit: 'Relaxed',
      occasions: ['Casual'],
      wear_count: 0,
      favorite: false,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'bottom_regular',
      user_id: userId,
      name: 'Classic Trousers',
      category: 'bottoms',
      original_image: 'file:///bot1.jpg',
      primary_color: '#2B2C2E',
      fit: 'Relaxed',
      occasions: ['Casual'],
      favorite: false,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'shoes_classic',
      user_id: userId,
      name: 'Minimal Sneakers',
      category: 'shoes',
      original_image: 'file:///shoes1.jpg',
      primary_color: '#FFFFFF',
      favorite: false,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await LocalStorage.removeItem(`aura_pref_signals_${userId}`);
  });

  it('prioritizes the fresh/unworn top over the top worn yesterday', async () => {
    const context: StylingContext = {
      occasion: 'Casual',
      mood: 'Relaxed',
    };

    const recommendations = await StylingEngine.generateRecommendations(userId, mockWardrobe, context);
    expect(recommendations.length).toBeGreaterThan(0);

    // The fresh unworn top should be ranked top due to recency penalty on yesterday's garment
    const topLook = recommendations[0];
    expect(topLook.garments.top.id).toBe('top_unworn_fresh');
  });
});
