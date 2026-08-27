import { Occasion } from '../../constants/categories';
import { StylingContext, MoodVibe } from '../../types/stylist';

export const POPULAR_OCCASIONS: Occasion[] = [
  'Casual',
  'Date Night',
  'Work / Office',
  'Evening / Event',
  'Streetwear',
  'Vacation',
  'Minimalist',
];

export const MOOD_VIBES: MoodVibe[] = [
  'Relaxed',
  'Minimal',
  'Bold',
  'Elegant',
  'Confident',
  'Cool',
  'Effortless',
];

export const ContextService = {
  getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  },

  getDefaultContext(): StylingContext {
    const time = this.getTimeOfDay();
    const isEvening = time === 'evening' || time === 'night';

    return {
      occasion: isEvening ? 'Date Night' : 'Casual',
      mood: isEvening ? 'Elegant' : 'Relaxed',
      timeOfDay: time,
      weather: {
        tempF: 68,
        condition: 'mild',
      },
    };
  },
};
