/**
 * Virtual Try-On Provider Architecture
 * 
 * SCIENTIFIC HONESTY & GOVERNANCE:
 * - DO NOT display a fake AI render or simulate a diffusion completion with a generic placeholder.
 * - Strict prohibition: External commercial third-party generative cloud endpoints are forbidden.
 * - Connects to the decoupled self-hosted VTO inference service (services/vto/server.py).
 * - Dynamically queries /health to verify GPU VRAM (>= 8GB) and licensing constraints.
 * - When an active diffusion engine is not running or blocked by hardware/licensing constraints,
 *   honestly report `engine_unavailable` with the precise technical diagnosis.
 */

import { TryOnRequest, TryOnResult, TryOnStatus } from '../../types/vto';
import { CloudStorageService, UploadedImageAsset } from '../storage/cloudStorageService';
import { VTOJobClient, getVtoBaseUrl } from './vtoJobClient';

export interface IVirtualTryOnProvider {
  isEngineAvailable(): Promise<{ available: boolean; reason: string }>;
  generateTryOn(
    request: TryOnRequest,
    onProgress?: (status: TryOnStatus) => void
  ): Promise<TryOnResult>;
}

export class AuraDiffusionVTOProvider implements IVirtualTryOnProvider {
  private getServiceUrl(): string {
    return getVtoBaseUrl() || 'http://127.0.0.1:8000';
  }

  /**
   * Checks whether the local or remote diffusion engine inference server is running and healthy.
   * Checks both /health (process running) and /ready (MMDiT and DWPose models initialized in GPU memory).
   */
  async isEngineAvailable(): Promise<{ available: boolean; reason: string }> {
    const serviceUrl = this.getServiceUrl();
    const url = `${serviceUrl}/health`;
    try {
      if (typeof fetch !== 'function') {
        return {
          available: false,
          reason: 'Virtual Try-On is not available yet. Dedicated on-device diffusion weights are in development.',
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          available: false,
          reason: 'Virtual Try-On is not available yet. VTO service returned degraded status.',
        };
      }

      const data = await res.json();
      if (data.status === 'healthy' || data.status === 'ok') {
        // Also check /ready to verify GPU models are initialized
        try {
          const readyController = new AbortController();
          const readyTimeoutId = setTimeout(() => readyController.abort(), 1500);
          const readyRes = await fetch(`${serviceUrl}/ready`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: readyController.signal,
          });
          clearTimeout(readyTimeoutId);
          if (readyRes.ok) {
            const readyData = await readyRes.json();
            if (readyData && readyData.ready === false) {
              return {
                available: false,
                reason: 'Virtual Try-On is not available yet. VTO neural models (MMDiT / DWPose) are still initializing in GPU memory.',
              };
            }
          }
        } catch {
          // /ready is optional on basic mock dev servers; if /health succeeded, proceed
        }

        return {
          available: true,
          reason: data.message || 'VTO diffusion engine active and ready.',
        };
      } else {
        const blockerMsg = Array.isArray(data.blockers) && data.blockers.length > 0
          ? data.blockers[0]
          : data.message;
        return {
          available: false,
          reason: `Virtual Try-On is not available yet. ${blockerMsg || 'Hardware or dependency constraints unfulfilled.'}`,
        };
      }
    } catch {
      return {
        available: false,
        reason: 'Virtual Try-On is not available yet. Dedicated on-device diffusion weights are in development.',
      };
    }
  }

  async generateTryOn(
    request: TryOnRequest,
    onProgress?: (status: TryOnStatus) => void
  ): Promise<TryOnResult> {
    const { userId, userImageUrl, userModel, garments } = request;

    if (!userModel && !userImageUrl) {
      throw new Error('User reference photo is required');
    }
    if (!garments || garments.length === 0) {
      throw new Error('At least one garment is required for virtual try-on');
    }

    const effectiveImageUrl =
      userImageUrl ||
      userModel?.primaryPhotoUri ||
      userModel?.primaryFaceUri ||
      '';

    if (!effectiveImageUrl || effectiveImageUrl.startsWith('aura://') || effectiveImageUrl === 'aura://personal_silhouette') {
      throw new Error('A real photo from your Personal AURA Model is required for neural Virtual Try-On. Please upload your photo in the Personal Model setup.');
    }

    // 1. Check user model
    onProgress?.('checking_model');
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 2. Check engine availability
    const engineCheck = await this.isEngineAvailable();
    if (!engineCheck.available) {
      onProgress?.('engine_unavailable');
      const nowIso = new Date().toISOString();
      return {
        id: 'vto_pending_' + Math.random().toString(36).substring(2, 9),
        user_id: userId,
        user_image_url: effectiveImageUrl,
        result_image_url: '', // No generated render exists while blocked.
        provider: 'aura_diffusion_vto',
        status: 'engine_unavailable',
        garment_ids: garments.map((g) => g.id),
        errorMessage: engineCheck.reason,
        created_at: nowIso,
        updated_at: nowIso,
      };
    }

    // 3. Delegate to VTO inference pipeline
    onProgress?.('processing');

    try {
      const primaryGarment = garments[0];
      const categoryMap: Record<string, string> = {
        top: 'tops',
        tops: 'tops',
        bottom: 'bottoms',
        bottoms: 'bottoms',
        shoes: 'shoes',
        footwear: 'shoes',
        outerwear: 'outerwear',
        dress: 'one-piece',
        'one-piece': 'one-piece',
      };
      const category = categoryMap[primaryGarment.category?.toLowerCase()];
      if (category !== 'tops' && category !== 'bottoms') {
        throw new Error('Only tops and bottoms are supported by neural VTO.');
      }

      // Auto-stage garment cutout to private 'vto_inputs' bucket if needed
      let garmentAsset: UploadedImageAsset | undefined = primaryGarment.storage_asset;
      if (!garmentAsset || garmentAsset.bucket !== 'vto_inputs') {
        const garmentImageUri = primaryGarment.processed_image || primaryGarment.original_image;
        if (!garmentImageUri) {
          throw new Error('This garment has no image to try on. Please add an image first.');
        }
        garmentAsset = await CloudStorageService.uploadPrivateImage(
          'vto_inputs',
          userId,
          garmentImageUri,
          `garment_${primaryGarment.id}_isolated.png`
        );
      }

      // Stage person reference photo to private 'vto_inputs' bucket
      const person = await CloudStorageService.uploadPrivateImage(
        'vto_inputs',
        userId,
        effectiveImageUrl,
        `person_${userId}.jpg`
      );

      const submitted = await VTOJobClient.create({
        category,
        garment_id: primaryGarment.id,
        person,
        garment: garmentAsset,
        outfit_name: request.outfitName,
        idempotency_key: `vto_${userId}_${primaryGarment.id}_${Date.now()}`,
      });

      let data = submitted;
      for (let attempt = 0; attempt < 120 && (data.status === 'queued' || data.status === 'processing'); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        data = await VTOJobClient.get(data.id);
      }

      const nowIso = new Date().toISOString();
      if (data.status !== 'completed' || !data.result_signed_url) {
        return {
          id: 'vto_err_' + Math.random().toString(36).substring(2, 9),
          user_id: userId,
          user_image_url: effectiveImageUrl,
          result_image_url: '',
          provider: 'aura_diffusion_vto',
          status: 'engine_unavailable',
          garment_ids: garments.map((g) => g.id),
          errorMessage: data.safe_error_message || `VTO job ${data.status}.`,
          created_at: nowIso,
          updated_at: nowIso,
        };
      }

      return {
        id: data.id,
        user_id: userId,
        user_image_url: effectiveImageUrl,
        // A completed result is accepted only when the service returned an
        // actual generated image. Never substitute the source image.
        result_image_url: data.result_signed_url,
        provider: 'aura_diffusion_vto',
        status: 'completed',
        garment_ids: garments.map((g) => g.id),
        created_at: nowIso,
        updated_at: nowIso,
      };
    } catch (err: any) {
      const nowIso = new Date().toISOString();
      return {
        id: 'vto_net_err_' + Math.random().toString(36).substring(2, 9),
        user_id: userId,
        user_image_url: effectiveImageUrl,
        result_image_url: '',
        provider: 'aura_diffusion_vto',
        status: 'engine_unavailable',
        garment_ids: garments.map((g) => g.id),
        errorMessage: `Virtual Try-On is not available yet. Connection failure: ${err?.message || 'Network error'}`,
        created_at: nowIso,
        updated_at: nowIso,
      };
    }
  }
}

export const vtoProvider: IVirtualTryOnProvider = new AuraDiffusionVTOProvider();
