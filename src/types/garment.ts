import { GarmentCategory, Season, Occasion } from '../constants/categories';

export interface Garment {
  id: string;
  user_id: string;
  wardrobe_id?: string;
  
  // Images (local URI or remote storage URL)
  original_image: string;
  processed_image?: string;
  thumbnail_image?: string;

  // Taxonomy & Core Metadata
  name: string;
  category: GarmentCategory;
  subcategory?: string;
  brand?: string;

  // Visual Attributes
  primary_color: string;
  secondary_colors?: string[];
  pattern?: string;
  material?: string;
  fit?: 'Oversized' | 'Relaxed' | 'Regular' | 'Slim' | 'Fitted';
  silhouette?: string;

  // Context & Tags
  season?: Season[];
  occasions?: Occasion[];
  favorite: boolean;
  user_verified: boolean;
  is_seed?: boolean;
  wear_count?: number;
  last_worn?: string;

  created_at: string;
  updated_at: string;
}

export interface GarmentProcessingResult {
  category: GarmentCategory;
  subcategory?: string;
  name: string;
  primary_color: string;
  secondary_colors?: string[];
  pattern?: string;
  material?: string;
  fit?: 'Oversized' | 'Relaxed' | 'Regular' | 'Slim' | 'Fitted';
  suggested_occasions?: Occasion[];
  suggested_seasons?: Season[];
  processed_image_uri?: string;
}
