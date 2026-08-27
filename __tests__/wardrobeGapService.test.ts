import { WardrobeGapService } from '../src/services/intelligence/wardrobeGapService';
import { LocalStorage } from '../src/services/storage/localStorage';
import { Garment } from '../src/types/garment';

describe('WardrobeGapService', () => {
  const userId = 'gap_test_user_88';

  const mockWardrobeWithoutOuterwear: Garment[] = [
    {
      id: 'g_top_1',
      user_id: userId,
      name: 'Oversized Linen Shirt',
      category: 'tops',
      original_image: 'file:///top1.jpg',
      primary_color: '#F0EFEA',
      fit: 'Oversized',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'g_bot_1',
      user_id: userId,
      name: 'Tailored Wide Trousers',
      category: 'bottoms',
      original_image: 'file:///bot1.jpg',
      primary_color: '#2B2C2E',
      fit: 'Relaxed',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'g_shoe_1',
      user_id: userId,
      name: 'Minimal White Sneakers',
      category: 'shoes',
      original_image: 'file:///shoe1.jpg',
      primary_color: '#FFFFFF',
      fit: 'Regular',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_garments_${userId}`, mockWardrobeWithoutOuterwear);
  });

  it('identifies missing versatile outerwear layer and calculates unlocked outfits', async () => {
    const gaps = await WardrobeGapService.detectWardrobeGaps(userId);

    expect(gaps.length).toBeGreaterThan(0);
    const outerwearGap = gaps.find((g) => g.category === 'outerwear');
    expect(outerwearGap).toBeDefined();
    expect(outerwearGap?.potentialOutfitsUnlocked).toBeGreaterThanOrEqual(1);
    expect(outerwearGap?.whyThisWorks).toContain('elevated layered looks');
  });

  it('respects the "You already own it" rule and does not recommend owned categories', async () => {
    const ownsWhiteSneakers = await WardrobeGapService.userAlreadyOwnsItem(userId, 'shoes', '#FFFFFF');
    expect(ownsWhiteSneakers).toBe(true);

    const ownsOuterwear = await WardrobeGapService.userAlreadyOwnsItem(userId, 'outerwear');
    expect(ownsOuterwear).toBe(false);
  });
});
