import { OutfitMemoryService } from '../src/services/memory/outfitMemoryService';
import { DatabaseService } from '../src/services/database/databaseService';
import { LocalStorage } from '../src/services/storage/localStorage';
import { Outfit } from '../src/types/outfit';
import { Garment } from '../src/types/garment';

describe('OutfitMemoryService', () => {
  const userId = 'user_memory_test';

  const mockGarments: Garment[] = [
    {
      id: 'garm_top_1',
      user_id: userId,
      name: 'Oversized Silk Oxford',
      category: 'tops',
      original_image: 'file:///top1.jpg',
      primary_color: '#F0EFEA',
      fit: 'Oversized',
      wear_count: 0,
      favorite: false,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'garm_bot_1',
      user_id: userId,
      name: 'Pleated Wide-Leg Pants',
      category: 'bottoms',
      original_image: 'file:///bot1.jpg',
      primary_color: '#2B2C2E',
      fit: 'Relaxed',
      wear_count: 0,
      favorite: false,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_garments_${userId}`, mockGarments);
    await LocalStorage.setItem(`aura_outfits_${userId}`, []);
    await LocalStorage.removeItem(`aura_wear_logs_${userId}`);
  });

  it('marks an outfit as worn, updates wear counts on outfit and constituent garments, and records wear log', async () => {
    const outfit = await DatabaseService.saveOutfit({
      user_id: userId,
      name: 'Contemporary Dinner Look',
      source: 'aura_stylist',
      garment_ids: ['garm_top_1', 'garm_bot_1'],
      favorite: true,
    });

    expect(outfit.worn_count).toBe(0);

    const result = await OutfitMemoryService.markOutfitAsWorn(userId, outfit.id, {
      wornDate: '2026-08-28',
      occasion: 'Dinner',
      notes: 'Wore to dinner downtown',
    });

    expect(result.outfit.worn_count).toBe(1);
    expect(result.outfit.last_worn).toBe('2026-08-28');
    expect(result.outfit.status).toBe('worn');

    // Verify constituent garments were updated
    const updatedGarments = await DatabaseService.getGarments(userId);
    const top = updatedGarments.find((g) => g.id === 'garm_top_1');
    const bottom = updatedGarments.find((g) => g.id === 'garm_bot_1');

    expect(top?.wear_count).toBe(1);
    expect(top?.last_worn).toBe('2026-08-28');
    expect(bottom?.wear_count).toBe(1);
    expect(bottom?.last_worn).toBe('2026-08-28');

    // Verify WearLog persistence
    const logs = await OutfitMemoryService.getWearLogs(userId);
    expect(logs.length).toBe(1);
    expect(logs[0].outfit_id).toBe(outfit.id);
    expect(logs[0].notes).toBe('Wore to dinner downtown');
  });

  it('correctly segments worn and unworn outfits', async () => {
    const outfit1 = await DatabaseService.saveOutfit({
      user_id: userId,
      name: 'Worn Look',
      source: 'mix_match',
      garment_ids: ['garm_top_1'],
      favorite: true,
    });

    const outfit2 = await DatabaseService.saveOutfit({
      user_id: userId,
      name: 'Unworn Look',
      source: 'mix_match',
      garment_ids: ['garm_bot_1'],
      favorite: true,
    });

    await OutfitMemoryService.markOutfitAsWorn(userId, outfit1.id);

    const worn = await OutfitMemoryService.getWornOutfits(userId);
    const unworn = await OutfitMemoryService.getUnwornOutfits(userId);

    expect(worn.length).toBe(1);
    expect(worn[0].id).toBe(outfit1.id);
    expect(unworn.length).toBe(1);
    expect(unworn[0].id).toBe(outfit2.id);
  });
});
