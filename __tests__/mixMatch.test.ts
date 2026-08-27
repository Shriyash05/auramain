import { Garment } from '../src/types/garment';
import { DatabaseService } from '../src/services/database/databaseService';
import { LocalStorage } from '../src/services/storage/localStorage';

describe('Mix & Match Flow', () => {
  const userId = 'user_stylist_01';

  beforeEach(async () => {
    await LocalStorage.removeItem(`aura_garments_${userId}`);
    await LocalStorage.removeItem(`aura_outfits_${userId}`);
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
});
