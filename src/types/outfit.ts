import { GarmentCategory, Occasion, Season } from '../constants/categories';

export interface OutfitGarmentReference {
  garment_id: string;
  category: GarmentCategory;
  position?: number;
}

export interface Outfit {
  id: string;
  user_id: string;
  name: string;
  source: 'aura_stylist' | 'mix_match' | 'inspiration' | 'imported';
  
  // References to actual garments
  garment_ids: string[];
  garments_map?: {
    top_id?: string;
    bottom_id?: string;
    shoes_id?: string;
    outerwear_id?: string;
    accessory_ids?: string[];
  };

  occasion?: Occasion;
  season?: Season;
  vibe?: string;
  notes?: string;
  favorite: boolean;
  worn_count: number;
  last_worn?: string;

  created_at: string;
  updated_at: string;
}
