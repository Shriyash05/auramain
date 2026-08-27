import { DatabaseService } from '../src/services/database/databaseService';
import { LocalStorage } from '../src/services/storage/localStorage';

describe('DatabaseService', () => {
  const testUserId = 'test_usr_123';

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_garments_${testUserId}`, []);
    await LocalStorage.setItem(`aura_outfits_${testUserId}`, []);
  });

  it('should persist and retrieve garments by user and category', async () => {
    const garment = await DatabaseService.addGarment({
      user_id: testUserId,
      name: 'Oversized Silk Shirt',
      category: 'tops',
      original_image: 'file:///images/top1.jpg',
      primary_color: '#FFFFFF',
      fit: 'Oversized',
      favorite: false,
      user_verified: true,
    });

    expect(garment.id).toBeDefined();
    expect(garment.name).toBe('Oversized Silk Shirt');

    const garments = await DatabaseService.getGarments(testUserId);
    expect(garments.length).toBe(1);
    expect(garments[0].category).toBe('tops');

    const tops = await DatabaseService.getGarmentsByCategory(testUserId, 'tops');
    expect(tops.length).toBe(1);

    const bottoms = await DatabaseService.getGarmentsByCategory(testUserId, 'bottoms');
    expect(bottoms.length).toBe(0);
  });

  it('should toggle garment favorite status and delete garment', async () => {
    const garment = await DatabaseService.addGarment({
      user_id: testUserId,
      name: 'Pleated Trousers',
      category: 'bottoms',
      original_image: 'file:///images/pants.jpg',
      primary_color: '#000000',
      fit: 'Relaxed',
      favorite: false,
      user_verified: true,
    });

    const updated = await DatabaseService.updateGarment(testUserId, garment.id, { favorite: true });
    expect(updated.favorite).toBe(true);

    await DatabaseService.deleteGarment(testUserId, garment.id);
    const remaining = await DatabaseService.getGarments(testUserId);
    expect(remaining.length).toBe(0);
  });

  it('should persist and retrieve outfits referencing garment IDs', async () => {
    const outfit = await DatabaseService.saveOutfit({
      user_id: testUserId,
      name: 'Monochrome Minimalist',
      source: 'mix_match',
      garment_ids: ['garm_1', 'garm_2'],
      garments_map: {
        top_id: 'garm_1',
        bottom_id: 'garm_2',
      },
      favorite: true,
    });

    expect(outfit.id).toBeDefined();
    expect(outfit.garment_ids).toContain('garm_1');

    const list = await DatabaseService.getOutfits(testUserId);
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('Monochrome Minimalist');
  });
});
