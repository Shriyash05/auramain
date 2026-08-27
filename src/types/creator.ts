export interface CreatorProfile {
  user_id: string;
  handle: string;
  display_name: string;
  bio?: string;
  profile_image_url?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  is_creator_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type ShootStatus = 'planning' | 'in_progress' | 'completed' | 'archived';
export type LookStatus = 'draft' | 'selected' | 'ready' | 'shot' | 'published' | 'archived';

export interface Shoot {
  id: string;
  user_id: string;
  name: string;
  date?: string;
  location?: string;
  concept: string;
  mood?: string;
  occasion?: string;
  notes?: string;
  inspiration_ids: string[];
  garment_capsule_ids: string[];
  look_ids: string[];
  status: ShootStatus;
  created_at: string;
  updated_at: string;
}

export interface ShootLook {
  id: string;
  shoot_id: string;
  user_id: string;
  outfit_id: string;
  name: string;
  status: LookStatus;
  final_photo_url?: string;
  tagged_garment_ids: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TaggedGarmentSummary {
  garment_id: string;
  name: string;
  category: string;
  primary_color?: string;
  fit?: string;
  brand?: string;
  image_url?: string;
}

export interface ShareableLook {
  id: string;
  public_share_id: string;
  user_id: string;
  creator_handle: string;
  creator_display_name: string;
  final_photo_url: string;
  title: string;
  caption?: string;
  concept?: string;
  tagged_garments: TaggedGarmentSummary[];
  is_published: boolean;
  views_count: number;
  saves_count: number;
  created_at: string;
  updated_at: string;
}

export interface Lookbook {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_photo_url?: string;
  look_ids: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
