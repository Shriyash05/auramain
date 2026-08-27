import { LocalStorage } from '../storage/localStorage';
import { DatabaseService } from '../database/databaseService';
import { FeedbackService } from '../feedback/feedbackService';
import { PreferenceLearningService } from '../stylist/preferenceLearningService';
import { WearLog } from '../../types/memory';
import { Outfit } from '../../types/outfit';
import { Garment } from '../../types/garment';

const WEAR_LOGS_KEY_PREFIX = 'aura_wear_logs_';

export const OutfitMemoryService = {
  async getWearLogs(userId: string): Promise<WearLog[]> {
    const logs = await LocalStorage.getItem<WearLog[]>(`${WEAR_LOGS_KEY_PREFIX}${userId}`);
    if (!logs) return [];
    return logs.sort((a, b) => new Date(b.worn_date).getTime() - new Date(a.worn_date).getTime());
  },

  async markOutfitAsWorn(
    userId: string,
    outfitId: string,
    options?: {
      wornDate?: string;
      occasion?: string;
      notes?: string;
      rating?: number;
    }
  ): Promise<{ outfit: Outfit; wearLog: WearLog }> {
    const wornDate = options?.wornDate || new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    // 1. Fetch current outfits and target
    const outfits = await DatabaseService.getOutfits(userId);
    const targetIndex = outfits.findIndex((o) => o.id === outfitId);
    if (targetIndex === -1) {
      throw new Error('Outfit not found');
    }

    const targetOutfit = outfits[targetIndex];
    const updatedOutfit: Outfit = {
      ...targetOutfit,
      status: 'worn',
      worn_count: (targetOutfit.worn_count || 0) + 1,
      last_worn: wornDate,
      updated_at: nowIso,
    };

    outfits[targetIndex] = updatedOutfit;
    await LocalStorage.setItem(`aura_outfits_${userId}`, outfits);

    // 2. Cascade wear stats to constituent garments
    const allGarments = await DatabaseService.getGarments(userId);
    const constituentGarments: Garment[] = [];

    for (let i = 0; i < allGarments.length; i++) {
      if (targetOutfit.garment_ids.includes(allGarments[i].id)) {
        allGarments[i] = {
          ...allGarments[i],
          wear_count: (allGarments[i].wear_count || 0) + 1,
          last_worn: wornDate,
          updated_at: nowIso,
        };
        constituentGarments.push(allGarments[i]);
      }
    }
    await LocalStorage.setItem(`aura_garments_${userId}`, allGarments);

    // 3. Create persistent WearLog
    const wearLog: WearLog = {
      id: 'wear_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      outfit_id: outfitId,
      worn_date: wornDate,
      occasion: options?.occasion || targetOutfit.occasion,
      notes: options?.notes,
      rating: options?.rating || 5,
      created_at: nowIso,
    };

    const existingLogs = await this.getWearLogs(userId);
    const updatedLogs = [wearLog, ...existingLogs];
    await LocalStorage.setItem(`${WEAR_LOGS_KEY_PREFIX}${userId}`, updatedLogs);

    // 4. Record behavioral feedback learning
    const event = await FeedbackService.recordEvent(userId, 'wear', outfitId, {
      occasion: wearLog.occasion,
      worn_date: wornDate,
    });
    await PreferenceLearningService.recordFeedbackLearning(userId, event, constituentGarments);

    return { outfit: updatedOutfit, wearLog };
  },

  async getWornOutfits(userId: string): Promise<Outfit[]> {
    const outfits = await DatabaseService.getOutfits(userId);
    return outfits.filter((o) => (o.worn_count || 0) > 0);
  },

  async getUnwornOutfits(userId: string): Promise<Outfit[]> {
    const outfits = await DatabaseService.getOutfits(userId);
    return outfits.filter((o) => !o.worn_count || o.worn_count === 0);
  },

  async getGarmentWearStats(userId: string): Promise<{
    mostWorn: Garment[];
    unworn: Garment[];
    totalWears: number;
    utilizationRate: number;
  }> {
    const garments = await DatabaseService.getGarments(userId);
    if (garments.length === 0) {
      return { mostWorn: [], unworn: [], totalWears: 0, utilizationRate: 0 };
    }

    const unworn = garments.filter((g) => !g.wear_count || g.wear_count === 0);
    const worn = garments.filter((g) => (g.wear_count || 0) > 0);
    const sortedMostWorn = [...worn].sort((a, b) => (b.wear_count || 0) - (a.wear_count || 0));
    const totalWears = garments.reduce((sum, g) => sum + (g.wear_count || 0), 0);
    const utilizationRate = Math.round((worn.length / garments.length) * 100);

    return {
      mostWorn: sortedMostWorn.slice(0, 5),
      unworn,
      totalWears,
      utilizationRate,
    };
  },

  async deleteWearLog(userId: string, logId: string): Promise<void> {
    const logs = await this.getWearLogs(userId);
    const filtered = logs.filter((l) => l.id !== logId);
    await LocalStorage.setItem(`${WEAR_LOGS_KEY_PREFIX}${userId}`, filtered);
  },

  async deleteWearHistory(userId: string): Promise<void> {
    await LocalStorage.removeItem(`${WEAR_LOGS_KEY_PREFIX}${userId}`);
  },
};
