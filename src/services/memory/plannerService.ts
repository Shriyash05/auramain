import { LocalStorage } from '../storage/localStorage';
import { OutfitMemoryService } from './outfitMemoryService';
import { PlannedEvent } from '../../types/memory';

const PLANNED_EVENTS_KEY_PREFIX = 'aura_planned_events_';

export const PlannerService = {
  async getEvents(userId: string): Promise<PlannedEvent[]> {
    const events = await LocalStorage.getItem<PlannedEvent[]>(`${PLANNED_EVENTS_KEY_PREFIX}${userId}`);
    if (!events) return [];
    return events.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  },

  async getUpcomingEvents(userId: string): Promise<PlannedEvent[]> {
    const events = await this.getEvents(userId);
    const today = new Date().toISOString().split('T')[0];
    return events.filter((e) => e.event_date >= today && e.status === 'planned');
  },

  async getTodaysPlannedEvent(userId: string): Promise<PlannedEvent | null> {
    const events = await this.getEvents(userId);
    const today = new Date().toISOString().split('T')[0];
    const match = events.find((e) => e.event_date === today && e.status === 'planned');
    return match || null;
  },

  async createEvent(
    userId: string,
    event: Omit<PlannedEvent, 'id' | 'user_id' | 'status' | 'created_at' | 'updated_at'>
  ): Promise<PlannedEvent> {
    const nowIso = new Date().toISOString();
    const newEvent: PlannedEvent = {
      ...event,
      id: 'event_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      status: 'planned',
      created_at: nowIso,
      updated_at: nowIso,
    };

    const current = await this.getEvents(userId);
    const updated = [...current, newEvent];
    await LocalStorage.setItem(`${PLANNED_EVENTS_KEY_PREFIX}${userId}`, updated);
    return newEvent;
  },

  async assignOutfitToEvent(userId: string, eventId: string, outfitId: string): Promise<PlannedEvent> {
    const events = await this.getEvents(userId);
    const idx = events.findIndex((e) => e.id === eventId);
    if (idx === -1) throw new Error('Event not found');

    events[idx] = {
      ...events[idx],
      outfit_id: outfitId,
      updated_at: new Date().toISOString(),
    };

    await LocalStorage.setItem(`${PLANNED_EVENTS_KEY_PREFIX}${userId}`, events);
    return events[idx];
  },

  async completeEvent(userId: string, eventId: string): Promise<PlannedEvent> {
    const events = await this.getEvents(userId);
    const idx = events.findIndex((e) => e.id === eventId);
    if (idx === -1) throw new Error('Event not found');

    const target = events[idx];
    events[idx] = {
      ...target,
      status: 'completed',
      updated_at: new Date().toISOString(),
    };

    await LocalStorage.setItem(`${PLANNED_EVENTS_KEY_PREFIX}${userId}`, events);

    // If there's an assigned outfit, mark it as worn
    if (target.outfit_id) {
      await OutfitMemoryService.markOutfitAsWorn(userId, target.outfit_id, {
        wornDate: target.event_date,
        occasion: target.occasion,
        notes: `Worn for ${target.title}`,
      });
    }

    return events[idx];
  },

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const events = await this.getEvents(userId);
    const filtered = events.filter((e) => e.id !== eventId);
    await LocalStorage.setItem(`${PLANNED_EVENTS_KEY_PREFIX}${userId}`, filtered);
  },
};
