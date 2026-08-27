import { PreferenceLearningService } from '../src/services/stylist/preferenceLearningService';
import { OutfitFeedbackEvent } from '../src/types/feedback';
import { Garment } from '../src/types/garment';
import { LocalStorage } from '../src/services/storage/localStorage';

describe('PreferenceLearningService', () => {
  const userId = 'user_pref_test_42';

  beforeEach(async () => {
    await LocalStorage.removeItem(`aura_pref_signals_${userId}`);
  });

  it('increases fit weight when user likes or saves an outfit', async () => {
    const garments: Garment[] = [
      {
        id: 'garm_1',
        user_id: userId,
        name: 'Oversized Blazer',
        category: 'outerwear',
        original_image: 'file:///1.jpg',
        primary_color: '#111111',
        fit: 'Oversized',
        favorite: false,
        user_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const initial = await PreferenceLearningService.getSignals(userId);
    const initialOversized = initial.fitWeights['Oversized'] || 1.0;

    const event: OutfitFeedbackEvent = {
      id: 'evt_1',
      user_id: userId,
      action: 'save',
      created_at: new Date().toISOString(),
    };

    const updated = await PreferenceLearningService.recordFeedbackLearning(userId, event, garments);
    expect(updated.fitWeights['Oversized']).toBeGreaterThan(initialOversized);
  });

  it('adjusts preference weights when user swaps garments in Studio', async () => {
    const garments: Garment[] = [
      {
        id: 'garm_relaxed',
        user_id: userId,
        name: 'Relaxed Trousers',
        category: 'bottoms',
        original_image: 'file:///relaxed.jpg',
        primary_color: '#111111',
        fit: 'Relaxed',
        favorite: false,
        user_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'garm_slim',
        user_id: userId,
        name: 'Slim Pants',
        category: 'bottoms',
        original_image: 'file:///slim.jpg',
        primary_color: '#111111',
        fit: 'Slim',
        favorite: false,
        user_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const event: OutfitFeedbackEvent = {
      id: 'evt_swap',
      user_id: userId,
      action: 'modify_garment',
      metadata: {
        new_garment_id: 'garm_relaxed',
        replaced_garment_id: 'garm_slim',
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    const updated = await PreferenceLearningService.recordFeedbackLearning(userId, event, garments);
    expect(updated.fitWeights['Relaxed']).toBeGreaterThan(updated.fitWeights['Slim']);
  });
});
