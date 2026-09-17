/**
 * VirtualTryOnService
 * 
 * Replaceable implementation boundary for Virtual Try-On.
 * Accepts:
 *   AuraUserModel + GarmentAsset[] + Outfit + Pose/Representation
 * 
 * Guarantees:
 * - Decoupled from specific VTO vendors
 * - Scientific honesty: When production neural inference engine is inactive,
 *   honestly reports status as 'engine_unavailable' with explanatory preparation notice.
 * - NEVER generates or returns a fake replacement render pretending to be a try-on.
 */

import {
  TryOnRequest,
  TryOnResult,
  TryOnStatus,
  AuraUserModel,
} from '../../types/vto';
import { Garment } from '../../types/garment';
import { Outfit } from '../../types/outfit';
import { MirrorService } from './mirrorService';
import { vtoProvider, IVirtualTryOnProvider } from './vtoProvider';

export interface VTOExecutionOptions {
  userModel?: AuraUserModel;
  garments: Garment[];
  outfit?: Outfit;
  outfitName?: string;
  poseId?: string;
  onProgress?: (status: TryOnStatus) => void;
}

export class VirtualTryOnService {
  private static provider: IVirtualTryOnProvider = vtoProvider;

  /**
   * Set a custom or pluggable VTO provider (e.g. for future local diffusion or on-device model)
   */
  static setProvider(newProvider: IVirtualTryOnProvider) {
    this.provider = newProvider;
  }

  /**
   * Inspect current engine status
   */
  static async checkEngineAvailability(): Promise<{ available: boolean; reason: string }> {
    return this.provider.isEngineAvailable();
  }

  /**
   * Main entrypoint to execute virtual try-on
   */
  static async executeTryOn(
    userId: string,
    options: VTOExecutionOptions
  ): Promise<TryOnResult> {
    const { garments, outfitName = 'Selected Garment', onProgress } = options;

    // 1. Verify user model
    onProgress?.('checking_model');
    const userModel = options.userModel || (await MirrorService.getUserModel(userId));
    const userPhoto = userModel?.primaryPhotoUri || userModel?.primaryFaceUri;

    if (!userPhoto && (!userModel || !userModel.isReady)) {
      throw new Error('A personal AURA model is required before trying on garments.');
    }

    if (!garments || garments.length === 0) {
      throw new Error('At least one garment is required for virtual try-on.');
    }

    const request: TryOnRequest = {
      userId,
      userImageUrl: userPhoto || '',
      userModel: userModel || undefined,
      garments,
      outfitName,
    };

    // 2. Delegate to active provider
    const result = await this.provider.generateTryOn(request, onProgress);

    // 3. Save result record if completed
    if (result.status === 'completed') {
      const recent = await MirrorService.getRecentTryOnResults(userId);
      // Handled in provider/mirrorService
    }

    return result;
  }

  /**
   * Get user's personal styling model
   */
  static async getUserModel(userId: string): Promise<AuraUserModel | null> {
    return MirrorService.getUserModel(userId);
  }

  /**
   * Save or update user's personal model
   */
  static async saveUserModel(
    userId: string,
    updates: Partial<AuraUserModel>
  ): Promise<AuraUserModel> {
    return MirrorService.saveUserModel(userId, updates);
  }

  /**
   * Check if user has initialized their personal AURA model
   */
  static async hasUserModel(userId: string): Promise<boolean> {
    return MirrorService.hasUserModel(userId);
  }
}
