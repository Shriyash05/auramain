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
  | 'folded'
  | 'wrinkled'
  | 'ambient_light'
  | 'low_light'
  | 'occluded';

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
