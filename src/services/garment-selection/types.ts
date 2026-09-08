/**
 * AURA Garment Selection & Crop Inference Contract (Phase 15)
 * ==========================================================
 * Strict typed interfaces for target garment selection, coordinate spaces,
 * crop validation, state management, and product-safe inference routing.
 */

import { AuraCategory, AuraFit, AuraSilhouette, AuraColorFamily, AuraPattern, AuraMaterial } from '../../types/garmentTaxonomy';

export type CoordinateSpace = 'normalized' | 'pixel' | 'display';

export type SelectionMethod = 'manual' | 'suggested' | 'full_image';

export type GarmentSelectionState =
  | 'IDLE'
  | 'IMAGE_SELECTED'
  | 'SELECTING_REGION'
  | 'REGION_SELECTED'
  | 'PROCESSING'
  | 'CLASSIFYING'
  | 'SUCCESS'
  | 'REFUSED'
  | 'ERROR'
  | 'CANCELED';

export interface BoundingBoxCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GarmentSelection {
  imageUri: string;
  bbox: BoundingBoxCoordinates;
  coordinateSpace: CoordinateSpace;
  sourceWidth: number;
  sourceHeight: number;
  cropPadding: number; // Proportional padding e.g. 0.05 (5%)
  selectionMethod: SelectionMethod;
  timestamp: string;
}

export interface SuggestedGarmentRegion {
  id: string;
  label: string; // Must be "SUGGESTED GARMENT"
  bbox: BoundingBoxCoordinates;
  confidence: number;
  categoryHint?: string;
}

export interface GarmentInferenceRequest {
  imageUri: string;
  selection: GarmentSelection;
  modelVersion: string;
  inferenceMode: 'full_image' | 'manual_crop' | 'suggested_crop';
}

export interface GarmentAttributesPayload {
  category: AuraCategory | 'unknown';
  subcategory?: string;
  color_family?: AuraColorFamily | 'unknown';
  fit?: AuraFit | 'unknown';
  silhouette?: AuraSilhouette | 'unknown';
  pattern?: AuraPattern | 'unknown';
  material?: AuraMaterial | 'unknown';
  formality_score?: number;
  occasions?: string[];
  seasons?: string[];
}

export interface GarmentInferenceResult {
  status: 'SUCCESS' | 'REFUSED' | 'ERROR';
  category: AuraCategory | 'unknown';
  confidence: number;
  attributes: GarmentAttributesPayload;
  modelVersion: string;
  selectionMethod: SelectionMethod;
  bbox: BoundingBoxCoordinates;
  latency: {
    crop_ms: number;
    inference_ms: number;
    total_ms: number;
  };
  refusalReason?: string;
  error?: string;
}

export interface CropValidationResult {
  isValid: boolean;
  errors: string[];
  clampedBox: BoundingBoxCoordinates;
}
