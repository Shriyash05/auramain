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

export interface IVirtualTryOnProvider {
  isEngineAvailable(): Promise<{ available: boolean; reason: string }>;
  generateTryOn(
    request: TryOnRequest,
    onProgress?: (status: TryOnStatus) => void
  ): Promise<TryOnResult>;
}

export class AuraDiffusionVTOProvider implements IVirtualTryOnProvider {
  private getServiceUrl(): string {
    return process.env.EXPO_PUBLIC_VTO_API_URL || 'http://127.0.0.1:8000';
  }

  /**
   * Checks whether the local diffusion engine inference server is running and healthy.
   */
  async isEngineAvailable(): Promise<{ available: boolean; reason: string }> {
    const url = `${this.getServiceUrl()}/health`;
    try {
      if (typeof fetch !== 'function') {
        return {
          available: false,
          reason: 'Virtual Try-On is not available yet. Dedicated on-device diffusion weights are in development.',
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

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
      if (data.status === 'healthy') {
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

    const effectiveImageUrl =
      userImageUrl ||
      userModel?.primaryFaceUri ||
      userModel?.primaryPhotoUri ||
      'aura://personal_silhouette';

    if (!userModel && !userImageUrl) {
      throw new Error('User reference photo is required');
    }
    if (!garments || garments.length === 0) {
      throw new Error('At least one garment is required for virtual try-on');
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
      const category = categoryMap[primaryGarment.category?.toLowerCase()] || 'tops';

      const res = await fetch(`${this.getServiceUrl()}/tryon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          person_image: effectiveImageUrl,
          garment_image: primaryGarment.processed_image || primaryGarment.original_image || '',
          category,
          outfit_name: request.outfitName,
        }),
      });

      const nowIso = new Date().toISOString();
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          id: 'vto_err_' + Math.random().toString(36).substring(2, 9),
          user_id: userId,
          user_image_url: effectiveImageUrl,
          result_image_url: '',
          provider: 'aura_diffusion_vto',
          status: 'engine_unavailable',
          garment_ids: garments.map((g) => g.id),
          errorMessage: errData.error_message || errData.detail || `Inference error (HTTP ${res.status})`,
          created_at: nowIso,
          updated_at: nowIso,
        };
      }

      const data = await res.json();
      return {
        id: data.id || 'vto_' + Math.random().toString(36).substring(2, 9),
        user_id: userId,
        user_image_url: effectiveImageUrl,
        // A completed result is accepted only when the service returned an
        // actual generated image.  Never substitute the source image.
        result_image_url: data.result_image || '',
        provider: 'aura_diffusion_vto',
        status: data.status === 'completed' && data.result_image ? 'completed' : 'engine_unavailable',
        garment_ids: garments.map((g) => g.id),
        errorMessage: data.error_message,
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
