import { Garment } from './garment';
import { Outfit } from './outfit';

export type TryOnStatus = 
  | 'idle' 
  | 'checking_model' 
  | 'preparing' 
  | 'processing' 
  | 'generating' 
  | 'completed' 
  | 'failed' 
  | 'engine_unavailable';

export type BodyShapeType =
  | 'straight'
  | 'athletic'
  | 'broader_shoulders'
  | 'fuller_midsection'
  | 'curved';

export interface UserProportions {
  heightCm?: number;
  heightUnit?: 'cm' | 'ft';
  heightFt?: number;
  heightIn?: number;
  weightKg?: number;
  weightUnit?: 'kg' | 'lbs';
  weightLbs?: number;
  waistInches?: number;
  chestInches?: number;
  inseamInches?: number;
}

export interface UserSizes {
  tops?: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL';
  bottoms?: string;
  shoes?: string;
}

export interface FaceReference {
  id: string;
  uri: string;
  angle?: 'front' | 'three_quarter' | 'profile';
  capturedAt: string;
}

export interface AuraUserModel {
  userId: string;
  proportions?: UserProportions;
  sizes?: UserSizes;
  bodyShape?: BodyShapeType;
  faceReferences?: FaceReference[];
  primaryFaceUri?: string;
  primaryPhotoUri?: string; // Optional full reference if supplied
  poses?: Array<{ id: string; name: string; photoUri: string }>;
  angles?: Array<{ id: string; name: string; photoUri: string }>;
  isReady: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TryOnRequest {
  userId: string;
  userImageUrl?: string;
  userModel?: AuraUserModel;
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

