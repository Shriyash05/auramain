export interface AppearanceProfile {
  height_cm?: number;
  fit_preference?: 'oversized' | 'tailored' | 'relaxed' | 'slim' | 'balanced';
  style_vibes?: string[];
  color_palette_preference?: string[];
  reference_photo_url?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  onboarding_completed: boolean;
  appearance?: AppearanceProfile;
  created_at: string;
  updated_at: string;
}
