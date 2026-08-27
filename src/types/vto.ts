import { Garment } from './garment';
import { Outfit } from './outfit';

export type TryOnStatus = 'idle' | 'preparing' | 'processing' | 'generating' | 'completed' | 'failed';

export interface TryOnRequest {
  userId: string;
  userImageUrl: string;
  garments: Garment[];
  outfitName: string;
}

export interface TryOnResult {
  id: string;
  user_id: string;
  outfit_id?: string;
  user_image_url: string;
  result_image_url: string;
  provider: 'aura_diffusion_vto' | 'neural_warp_server' | 'fallback_preview';
  status: TryOnStatus;
  garment_ids: string[];
  errorMessage?: string;
  created_at: string;
  updated_at: string;
}
