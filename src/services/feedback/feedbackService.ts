import { LocalStorage } from '../storage/localStorage';
import { supabase, isSupabaseConfigured } from '../auth/authService';
import { OutfitFeedbackEvent, FeedbackAction } from '../../types/feedback';

const FEEDBACK_EVENTS_KEY = 'aura_feedback_events';

export const FeedbackService = {
  async recordEvent(
    userId: string,
    action: FeedbackAction,
    outfitId?: string,
    metadata?: Record<string, any>
  ): Promise<OutfitFeedbackEvent> {
    const event: OutfitFeedbackEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      outfit_id: outfitId,
      action,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('outfit_events').insert(event);
    }

    const current = (await LocalStorage.getItem<OutfitFeedbackEvent[]>(FEEDBACK_EVENTS_KEY)) || [];
    await LocalStorage.setItem(FEEDBACK_EVENTS_KEY, [event, ...current]);

    return event;
  },

  async getEvents(): Promise<OutfitFeedbackEvent[]> {
    return (await LocalStorage.getItem<OutfitFeedbackEvent[]>(FEEDBACK_EVENTS_KEY)) || [];
  },
};
