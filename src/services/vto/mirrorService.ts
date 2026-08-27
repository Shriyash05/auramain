import { LocalStorage } from '../storage/localStorage';
import { DatabaseService } from '../database/databaseService';
import { FeedbackService } from '../feedback/feedbackService';
import { PreferenceLearningService } from '../stylist/preferenceLearningService';
import { TryOnResult, TryOnRequest, TryOnStatus } from '../../types/vto';
import { vtoProvider } from './vtoProvider';
import { Outfit } from '../../types/outfit';

const USER_PHOTO_KEY_PREFIX = 'aura_user_model_photo_';
const TRYON_RESULTS_KEY_PREFIX = 'aura_tryon_results_';

export const MirrorService = {
  async getUserModelPhoto(userId: string): Promise<string | null> {
    return LocalStorage.getItem<string>(`${USER_PHOTO_KEY_PREFIX}${userId}`);
  },

  async saveUserModelPhoto(userId: string, photoUri: string): Promise<void> {
    await LocalStorage.setItem(`${USER_PHOTO_KEY_PREFIX}${userId}`, photoUri);
  },

  async deleteUserModelPhoto(userId: string): Promise<void> {
    await LocalStorage.removeItem(`${USER_PHOTO_KEY_PREFIX}${userId}`);
  },

  async getRecentTryOnResults(userId: string): Promise<TryOnResult[]> {
    const list = await LocalStorage.getItem<TryOnResult[]>(`${TRYON_RESULTS_KEY_PREFIX}${userId}`);
    if (!list) return [];
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async executeVirtualTryOn(
    request: TryOnRequest,
    onProgress?: (status: TryOnStatus) => void
  ): Promise<TryOnResult> {
    const result = await vtoProvider.generateTryOn(request, onProgress);

    if (result.status === 'completed') {
      const current = await this.getRecentTryOnResults(request.userId);
      const updated = [result, ...current.slice(0, 10)];
      await LocalStorage.setItem(`${TRYON_RESULTS_KEY_PREFIX}${request.userId}`, updated);
    }

    return result;
  },

  async saveTryOnOutfit(
    userId: string,
    outfitName: string,
    garmentIds: string[],
    vtoResultId?: string
  ): Promise<Outfit> {
    const savedOutfit = await DatabaseService.saveOutfit({
      user_id: userId,
      name: outfitName,
      source: 'aura_stylist',
      garment_ids: garmentIds,
      favorite: true,
      notes: 'Visualized and approved via AURA Virtual Try-On Mirror',
    });

    // Record learning signal
    const event = await FeedbackService.recordEvent(userId, 'save', savedOutfit.id, {
      vto_result_id: vtoResultId,
    });
    const allGarments = await DatabaseService.getGarments(userId);
    const constituent = allGarments.filter((g) => garmentIds.includes(g.id));
    await PreferenceLearningService.recordFeedbackLearning(userId, event, constituent);

    return savedOutfit;
  },

  async deleteTryOnResult(userId: string, resultId: string): Promise<void> {
    const list = await this.getRecentTryOnResults(userId);
    const filtered = list.filter((r) => r.id !== resultId);
    await LocalStorage.setItem(`${TRYON_RESULTS_KEY_PREFIX}${userId}`, filtered);
  },
};
