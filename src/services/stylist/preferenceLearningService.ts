import { LocalStorage } from '../storage/localStorage';
import { PreferenceSignals } from '../../types/stylist';
import { OutfitFeedbackEvent } from '../../types/feedback';
import { Garment } from '../../types/garment';

const PREFERENCE_KEY_PREFIX = 'aura_pref_signals_';

const DEFAULT_SIGNALS: PreferenceSignals = {
  fitWeights: {
    Relaxed: 1.2,
    Oversized: 1.1,
    Regular: 1.0,
    Tailored: 1.1,
    Slim: 0.9,
  },
  colorWeights: {},
  occasionWeights: {},
  silhouetteWeights: {},
  monochromePreference: 1.0,
  unwornPieceBoost: 1.3,
  lastUpdated: new Date().toISOString(),
};

export const PreferenceLearningService = {
  async getSignals(userId: string): Promise<PreferenceSignals> {
    const stored = await LocalStorage.getItem<PreferenceSignals>(`${PREFERENCE_KEY_PREFIX}${userId}`);
    return stored || { ...DEFAULT_SIGNALS, lastUpdated: new Date().toISOString() };
  },

  async recordFeedbackLearning(
    userId: string,
    event: OutfitFeedbackEvent,
    garments?: Garment[]
  ): Promise<PreferenceSignals> {
    const signals = await this.getSignals(userId);
    const updated = { ...signals };

    // 1. Process explicit Likes & Saves
    if (event.action === 'like' || event.action === 'save') {
      const multiplier = event.action === 'save' ? 1.2 : 1.1;
      garments?.forEach((g) => {
        if (g.fit) {
          updated.fitWeights[g.fit] = (updated.fitWeights[g.fit] || 1.0) * multiplier;
        }
        if (g.primary_color) {
          updated.colorWeights[g.primary_color] = (updated.colorWeights[g.primary_color] || 1.0) * multiplier;
        }
      });
    }

    // 2. Process Dislikes
    if (event.action === 'dislike') {
      garments?.forEach((g) => {
        if (g.fit) {
          updated.fitWeights[g.fit] = Math.max(0.5, (updated.fitWeights[g.fit] || 1.0) * 0.85);
        }
      });
    }

    // 3. Process Garment Replacements in Studio (e.g. replacing slim with relaxed)
    if (event.action === 'modify_garment' && event.metadata) {
      const { new_garment_id, replaced_garment_id } = event.metadata;
      const newG = garments?.find((g) => g.id === new_garment_id);
      const oldG = garments?.find((g) => g.id === replaced_garment_id);

      if (newG?.fit) {
        updated.fitWeights[newG.fit] = (updated.fitWeights[newG.fit] || 1.0) * 1.15;
      }
      if (oldG?.fit && oldG.fit !== newG?.fit) {
        updated.fitWeights[oldG.fit] = Math.max(0.6, (updated.fitWeights[oldG.fit] || 1.0) * 0.9);
      }
    }

    updated.lastUpdated = new Date().toISOString();
    await LocalStorage.setItem(`${PREFERENCE_KEY_PREFIX}${userId}`, updated);
    return updated;
  },
};
