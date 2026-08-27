import { FeedbackService } from '../src/services/feedback/feedbackService';
import { LocalStorage } from '../src/services/storage/localStorage';

describe('FeedbackService', () => {
  beforeEach(async () => {
    await LocalStorage.removeItem('aura_feedback_events');
  });

  it('should record user interaction events for the learning foundation', async () => {
    const event = await FeedbackService.recordEvent('user_99', 'like', 'outfit_1', {
      top_id: 'garm_top_1',
    });

    expect(event.id).toBeDefined();
    expect(event.action).toBe('like');
    expect(event.metadata?.top_id).toBe('garm_top_1');

    const allEvents = await FeedbackService.getEvents();
    expect(allEvents.length).toBe(1);
    expect(allEvents[0].id).toBe(event.id);
  });
});
