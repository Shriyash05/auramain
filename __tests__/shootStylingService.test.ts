import { ShootStylingService } from '../src/services/creator/shootStylingService';
import { LocalStorage } from '../src/services/storage/localStorage';
import { Garment } from '../src/types/garment';
import { Shoot } from '../src/types/creator';

describe('ShootStylingService', () => {
  const userId = 'creator_shoot_styling_user';

  const mockWardrobe: Garment[] = [
    {
      id: 'g_top_1',
      user_id: userId,
      name: 'Linen Oversized Shirt',
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
      id: 'g_top_2',
      user_id: userId,
      name: 'Silk Camp Collar',
      category: 'tops',
      original_image: 'file:///top2.jpg',
      primary_color: '#2B2C2E',
      fit: 'Relaxed',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'g_bot_1',
      user_id: userId,
      name: 'Pleated Cream Trousers',
      category: 'bottoms',
      original_image: 'file:///bot1.jpg',
      primary_color: '#F0EFEA',
      fit: 'Relaxed',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'g_bot_2',
      user_id: userId,
      name: 'Charcoal Linen Shorts',
      category: 'bottoms',
      original_image: 'file:///bot2.jpg',
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
      name: 'Leather Loafers',
      category: 'shoes',
      original_image: 'file:///shoe1.jpg',
      primary_color: '#1A1A1A',
      fit: 'Regular',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockShoot: Shoot = {
    id: 'shoot_test_1',
    user_id: userId,
    name: 'Summer Resort Campaign',
    concept: 'Relaxed summer tailoring and natural fabrics',
    mood: 'Resort',
    occasion: 'Campaign',
    inspiration_ids: [],
    garment_capsule_ids: [],
    look_ids: [],
    status: 'planning',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_garments_${userId}`, mockWardrobe);
    await LocalStorage.setItem(`aura_outfits_${userId}`, []);
  });

  it('generates diverse multi-look set using creator wardrobe', async () => {
    const lookSet = await ShootStylingService.generateShootLookSet(userId, mockShoot, 3);

    expect(lookSet.length).toBeGreaterThan(0);
    expect(lookSet[0].name).toContain('Look 01');
    expect(lookSet[0].candidate.garments.top).toBeDefined();
    expect(lookSet[0].candidate.garments.bottom).toBeDefined();
    expect(lookSet[0].rationale).toContain('Relaxed summer tailoring');
  });
});
