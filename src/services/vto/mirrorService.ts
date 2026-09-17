import { LocalStorage } from '../storage/localStorage';
import { DatabaseService } from '../database/databaseService';
import { FeedbackService } from '../feedback/feedbackService';
import { PreferenceLearningService } from '../stylist/preferenceLearningService';
import {
  TryOnResult,
  TryOnRequest,
  TryOnStatus,
  AuraUserModel,
  UserProportions,
  UserSizes,
  BodyShapeType,
  FaceReference,
} from '../../types/vto';
import { vtoProvider } from './vtoProvider';
import { Outfit } from '../../types/outfit';

export { AuraUserModel, UserProportions, UserSizes, BodyShapeType, FaceReference };

const USER_PHOTO_KEY_PREFIX = 'aura_user_model_photo_';
const USER_MODEL_DATA_KEY_PREFIX = 'aura_user_model_data_';
const TRYON_RESULTS_KEY_PREFIX = 'aura_tryon_results_';

export const MirrorService = {
  async getUserModelPhoto(userId: string): Promise<string | null> {
    const model = await this.getUserModel(userId);
    if (model?.primaryFaceUri) return model.primaryFaceUri;
    if (model?.primaryPhotoUri) return model.primaryPhotoUri;
    const direct = await LocalStorage.getItem<string>(`${USER_PHOTO_KEY_PREFIX}${userId}`);
    return direct || null;
  },

  async hasUserModel(userId: string): Promise<boolean> {
    const model = await this.getUserModel(userId);
    if (model && (model.isReady || model.primaryFaceUri || model.primaryPhotoUri || model.proportions)) {
      return true;
    }
    const photo = await LocalStorage.getItem<string>(`${USER_PHOTO_KEY_PREFIX}${userId}`);
    return Boolean(photo && photo.trim().length > 0);
  },

  async getUserModel(userId: string): Promise<AuraUserModel | null> {
    return LocalStorage.getItem<AuraUserModel>(`${USER_MODEL_DATA_KEY_PREFIX}${userId}`);
  },

  async saveUserModel(userId: string, updates: Partial<AuraUserModel>): Promise<AuraUserModel> {
    const now = new Date().toISOString();
    const existing = await this.getUserModel(userId);
    const updated: AuraUserModel = {
      userId,
      proportions: updates.proportions ?? existing?.proportions,
      sizes: updates.sizes ?? existing?.sizes,
      bodyShape: updates.bodyShape ?? existing?.bodyShape,
      faceReferences: updates.faceReferences ?? existing?.faceReferences ?? [],
      primaryFaceUri: updates.primaryFaceUri ?? existing?.primaryFaceUri,
      primaryPhotoUri: updates.primaryPhotoUri ?? existing?.primaryPhotoUri,
      poses: updates.poses ?? existing?.poses,
      angles: updates.angles ?? existing?.angles,
      isReady: updates.isReady ?? existing?.isReady ?? true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    // If primaryFaceUri or primaryPhotoUri is present, sync to photo key as well
    const displayPhoto = updated.primaryFaceUri || updated.primaryPhotoUri;
    if (displayPhoto) {
      await LocalStorage.setItem(`${USER_PHOTO_KEY_PREFIX}${userId}`, displayPhoto);
    }

    await LocalStorage.setItem(`${USER_MODEL_DATA_KEY_PREFIX}${userId}`, updated);
    return updated;
  },

  async saveUserModelPhoto(userId: string, photoUri: string): Promise<void> {
    const now = new Date().toISOString();
    await LocalStorage.setItem(`${USER_PHOTO_KEY_PREFIX}${userId}`, photoUri);
    const existing = await this.getUserModel(userId);
    const model: AuraUserModel = {
      userId,
      primaryFaceUri: existing?.primaryFaceUri || photoUri,
      primaryPhotoUri: photoUri,
      poses: existing?.poses || [{ id: 'front_standing', name: 'Front Standing', photoUri }],
      angles: existing?.angles || [{ id: 'front', name: 'Front', photoUri }],
      isReady: true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await LocalStorage.setItem(`${USER_MODEL_DATA_KEY_PREFIX}${userId}`, model);
  },

  async deleteUserModel(userId: string): Promise<void> {
    await LocalStorage.removeItem(`${USER_PHOTO_KEY_PREFIX}${userId}`);
    await LocalStorage.removeItem(`${USER_MODEL_DATA_KEY_PREFIX}${userId}`);
  },

  async deleteUserModelPhoto(userId: string): Promise<void> {
    await this.deleteUserModel(userId);
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
