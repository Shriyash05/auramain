import { GarmentTaxonomyLabels } from './garmentTaxonomy';

export type ContributorConsentVersion = 'AURA_RESEARCH_CONSENT_V1';

export type ContributorStatus = 'not_enrolled' | 'active' | 'revoked';

export type ContributionStatus =
  | 'submitted'
  | 'sanitized'
  | 'awaiting_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export type ContributionDifficulty = 'easy' | 'normal' | 'hard' | 'adversarial';

export type ContributionCaptureContext =
  | 'studio'
  | 'flat_lay'
  | 'on_body'
  | 'hanger'
  | 'folded'
  | 'wrinkled'
  | 'held_in_hand'
  | 'ambient_light'
  | 'low_light'
  | 'warm_tungsten'
  | 'cool_led'
  | 'daylight'
  | 'occluded'
  | 'cluttered_background'
  | 'closet_environment'
  | 'bedroom'
  | 'changing_room'
  | 'outdoor';

export type PhotographyContext = 'on_body' | 'flat_lay' | 'hanger' | 'folded' | 'held_in_hand' | 'partial_garment' | 'closet_environment' | 'bedroom' | 'changing_room' | 'outdoor';
export type LightingContext = 'daylight' | 'indoor_neutral' | 'warm_tungsten' | 'cool_led' | 'low_light' | 'uneven_lighting' | 'backlit' | 'shadowed';
export type GarmentCondition = 'pristine' | 'wrinkled' | 'folded' | 'partially_obscured' | 'layered' | 'low_contrast';
export type CameraViewContext = 'smartphone' | 'wide_angle' | 'portrait_mode' | 'close_range' | 'medium_range' | 'oblique_view';
export type BackgroundContext = 'clean' | 'bedroom' | 'closet' | 'floor' | 'chair' | 'street' | 'bathroom' | 'cluttered';

export interface DetailedCaptureContext {
  photography_context?: PhotographyContext;
  lighting?: LightingContext;
  condition?: GarmentCondition;
  camera_view?: CameraViewContext;
  background?: BackgroundContext;
}

export interface ContributorProgramProfile {
  user_id: string;
  status: ContributorStatus;
  consent_version: ContributorConsentVersion;
  consented_at?: string;
  revoked_at?: string;
  allowed_purposes: string[];
  training_eligible: boolean;
  research_eligible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResearchContribution {
  id: string;
  contributor_sample_id: string;
  user_id: string;
  source_garment_id: string;
  status: ContributionStatus;
  consent_version: ContributorConsentVersion;
  difficulty: ContributionDifficulty;
  capture_context: ContributionCaptureContext;
  detailed_context?: DetailedCaptureContext;
  challenge_notes?: string;
  sanitized_image_uri: string;
  submitted_labels: GarmentTaxonomyLabels;
  reviewed_labels?: GarmentTaxonomyLabels;
  submitted_at: string;
  sanitized_at: string;
  reviewed_at?: string;
  reviewer_status?: 'CORRECT' | 'INCORRECT' | 'AMBIGUOUS' | 'UNKNOWN' | 'REJECTED';
  reviewer_notes?: string;
  withdrawn_at?: string;
  dataset_version?: string;
  license_status: 'AURA_CONTRIBUTOR_OPT_IN';
  created_at: string;
  updated_at: string;
}

export interface ContributorStats {
  status: ContributorStatus;
  consented_at?: string;
  total_submitted: number;
  total_approved: number;
  total_rejected: number;
  total_withdrawn: number;
  total_awaiting_review: number;
}
