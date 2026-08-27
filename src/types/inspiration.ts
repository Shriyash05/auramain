import { Garment } from './garment';
import { GarmentCategory, Occasion } from '../constants/categories';

export interface ExtractedPiece {
  category: GarmentCategory;
  item_description: string;
  color: string;
  fit?: string;
  pattern?: string;
}

export type MatchQuality = 'exact' | 'close' | 'similar' | 'alternative' | 'missing';

export interface MatchedPiece {
  target_piece_category: GarmentCategory;
  user_garment_id?: string;
  match_quality: MatchQuality;
  match_label: string; // e.g. "Exact match", "Very close", "Similar silhouette", "Missing piece"
  user_garment?: Garment;
}

export interface InspirationItem {
  id: string;
  user_id: string;
  image_url: string;
  source_type: 'gallery' | 'camera' | 'curated' | 'import';
  title: string;
  style_formula: string; // e.g. "Oversized top + wide trousers + minimal shoes"
  aesthetic: string; // e.g. "Minimal Contemporary"
  mood: string; // e.g. "Effortless"
  occasion?: Occasion | string;
  extracted_pieces: ExtractedPiece[];
  matched_pieces: MatchedPiece[];
  aura_version_outfit_id?: string;
  created_at: string;
  updated_at: string;
}
