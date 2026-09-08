/**
 * AURA Garment Localization & Cropping Domain Types
 * Phase 13C Architecture
 */

export interface BoundingBox {
  /** Normalized x-coordinate [0, 1] from left */
  x: number;
  /** Normalized y-coordinate [0, 1] from top */
  y: number;
  /** Normalized width [0, 1] */
  width: number;
  /** Normalized height [0, 1] */
  height: number;
  /** Pixel bounding box [x, y, width, height] */
  pixel_bbox?: [number, number, number, number];
}

export type OcclusionLevel = 'visible' | 'partially_occluded' | 'heavily_occluded';
export type ReviewState = 'CORRECT' | 'INCORRECT' | 'AMBIGUOUS' | 'UNKNOWN';

export interface GarmentInstanceAnnotation {
  id: string;
  category: string;
  subcategory?: string;
  bbox: BoundingBox;
  occlusion: OcclusionLevel;
  state: ReviewState;
  is_target_garment: boolean;
}

export interface ImageLocalizationAnnotation {
  image_id: string;
  image_path: string;
  image_width: number;
  image_height: number;
  garment_instances: GarmentInstanceAnnotation[];
  annotator_notes?: string;
}

export interface GarmentRegionProposal {
  id: string;
  bbox: BoundingBox;
  confidence: number;
  category_hint?: string;
  crop_path?: string;
  is_oracle?: boolean;
}

export interface IGarmentLocalizationService {
  localizeGarments(
    imageUri: string,
    options?: { maxProposals?: number; minConfidence?: number }
  ): Promise<GarmentRegionProposal[]>;
  applyPadding?(box: BoundingBox, paddingPercentage: number): BoundingBox;
}
