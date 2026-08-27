import { PlannerService } from '../src/services/memory/plannerService';
import { DatabaseService } from '../src/services/database/databaseService';
import { OutfitMemoryService } from '../src/services/memory/outfitMemoryService';
import { LocalStorage } from '../src/services/storage/localStorage';
import { Garment } from '../src/types/garment';

describe('PlannerService', () => {
  const userId = 'user_planner_test';

  const mockGarments: Garment[] = [
    {
      id: 'garm_p_1',
      user_id: userId,
      name: 'Tailored Blazer',
      category: 'outerwear',
      original_image: 'file:///blazer.jpg',
      primary_color: '#111111',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_garments_${userId}`, mockGarments);
    await LocalStorage.setItem(`aura_outfits_${userId}`, []);
    await LocalStorage.removeItem(`aura_planned_events_${userId}`);
    await LocalStorage.removeItem(`aura_wear_logs_${userId}`);
  });

  it('creates planned events and assigns outfits', async () => {
    const outfit = await DatabaseService.saveOutfit({
      user_id: userId,
      name: 'Event Look',
      source: 'aura_stylist',
      garment_ids: ['garm_p_1'],
      favorite: true,
    });

    const event = await PlannerService.createEvent(userId, {
      title: 'Art Gallery Opening',
      event_date: '2026-09-01',
      event_time: '20:00',
      occasion: 'Evening / Event',
      outfit_id: outfit.id,
    });

    expect(event.id).toBeDefined();
    expect(event.status).toBe('planned');
    expect(event.outfit_id).toBe(outfit.id);

    const upcoming = await PlannerService.getUpcomingEvents(userId);
    expect(upcoming.length).toBe(1);
    expect(upcoming[0].title).toBe('Art Gallery Opening');
  });

  it('completes an event and cascades wear status to assigned outfit', async () => {
    const outfit = await DatabaseService.saveOutfit({
      user_id: userId,
      name: 'Dinner Look',
      source: 'aura_stylist',
      garment_ids: ['garm_p_1'],
      favorite: true,
    });

    const event = await PlannerService.createEvent(userId, {
      title: 'Anniversary Dinner',
      event_date: '2026-08-28',
      occasion: 'Dinner',
      outfit_id: outfit.id,
    });

    await PlannerService.completeEvent(userId, event.id);

    const updatedEvents = await PlannerService.getEvents(userId);
    expect(updatedEvents[0].status).toBe('completed');

    // Verify outfit wear count updated
    const outfits = await DatabaseService.getOutfits(userId);
    const updatedOutfit = outfits.find((o) => o.id === outfit.id);
    expect(updatedOutfit?.worn_count).toBe(1);
  });
});
