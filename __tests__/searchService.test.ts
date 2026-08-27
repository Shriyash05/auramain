import { UniversalSearchService } from '../src/services/intelligence/searchService';
import { LocalStorage } from '../src/services/storage/localStorage';
import { Garment } from '../src/types/garment';
import { Outfit } from '../src/types/outfit';

describe('UniversalSearchService', () => {
  const userId = 'search_test_user_77';

  const mockGarments: Garment[] = [
    {
      id: 'g_cream_shirt',
      user_id: userId,
      name: 'Cream Silk Shirt',
      category: 'tops',
      original_image: 'file:///cream_shirt.jpg',
      primary_color: '#F0EFEA',
      fit: 'Oversized',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'g_black_pant',
      user_id: userId,
      name: 'Black Pleated Trousers',
      category: 'bottoms',
      original_image: 'file:///black_pant.jpg',
      primary_color: '#111111',
      fit: 'Relaxed',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockOutfits: Outfit[] = [
    {
      id: 'outfit_dinner',
      user_id: userId,
      name: 'Editorial Dinner Look',
      source: 'aura_stylist',
      garment_ids: ['g_cream_shirt', 'g_black_pant'],
      occasion: 'Evening / Event',
      worn_count: 1,
      favorite: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_garments_${userId}`, mockGarments);
    await LocalStorage.setItem(`aura_outfits_${userId}`, mockOutfits);
  });

  it('searches garments by name and category keyword', async () => {
    const results = await UniversalSearchService.searchWardrobeAndOutfits(userId, 'Silk');
    expect(results.garments.length).toBe(1);
    expect(results.garments[0].name).toBe('Cream Silk Shirt');
  });

  it('searches outfits by occasion and name keyword', async () => {
    const results = await UniversalSearchService.searchWardrobeAndOutfits(userId, 'Dinner');
    expect(results.outfits.length).toBe(1);
    expect(results.outfits[0].name).toBe('Editorial Dinner Look');
  });

  it('returns empty results on empty query', async () => {
    const results = await UniversalSearchService.searchWardrobeAndOutfits(userId, '');
    expect(results.totalMatches).toBe(0);
  });
});
