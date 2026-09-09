/**
 * AURA Garment Inference Telemetry Types (Phase 15C)
 * ==================================================
 * Typed event contract and privacy-preserving metadata types for observing
 * experimental garment model performance in production workflows.
 * 
 * STRICT PRIVACY PRINCIPLES:
 * - Zero raw images, image URLs, file paths, base64 strings, EXIF, or crop bitmaps.
 * - Coarse buckets for confidence, latency, and aspect ratio.
 * - Only technical aggregate metrics.
 */

export type GarmentTelemetryEventType =
  | 'GARMENT_IMAGE_SELECTED'
  | 'GARMENT_SELECTION_STARTED'
  | 'GARMENT_SELECTION_CONFIRMED'
  | 'GARMENT_SELECTION_CANCELED'
  | 'GARMENT_SELECTION_RESET'
  | 'GARMENT_SUGGESTION_SHOWN'
  | 'GARMENT_SUGGESTION_ACCEPTED'
  | 'GARMENT_SUGGESTION_OVERRIDDEN'
  | 'GARMENT_CROP_CREATED'
  | 'GARMENT_INFERENCE_STARTED'
  | 'GARMENT_INFERENCE_SUCCESS'
  | 'GARMENT_INFERENCE_REFUSED'
  | 'GARMENT_INFERENCE_ERROR'
  | 'GARMENT_SAVE_SUCCESS'
  | 'GARMENT_PREDICTION_FEEDBACK';

export type ConfidenceBucket =
  | '<0.25'
  | '0.25-0.49'
  | '0.50-0.64'
  | '0.65-0.79'
  | '0.80-0.89'
  | '>=0.90';

export type LatencyBucket =
  | '<250ms'
  | '250-500ms'
  | '500-1000ms'
  | '1-2s'
  | '>2s';

export type ImageOrientation = 'portrait' | 'landscape' | 'square';

export type CropAspectBucket = 'tall' | 'wide' | 'square';

export type PlatformType = 'web' | 'android' | 'ios';

export type TelemetryErrorCode =
  | 'INVALID_IMAGE'
  | 'INVALID_CROP'
  | 'MODEL_UNAVAILABLE'
  | 'MODEL_LOAD_ERROR'
  | 'INFERENCE_TIMEOUT'
  | 'INFERENCE_ERROR'
  | 'SAVE_ERROR'
  | 'USER_CANCELLED';

export type TelemetrySelectionMethod =
  | 'manual'
  | 'suggested'
  | 'suggested_then_manual';

export type TelemetryPredictionFeedback = 'CORRECT' | 'INCORRECT' | 'NOT_SURE';

export interface GarmentTelemetryMetadata {
  model_version?: string;
  selection_method?: TelemetrySelectionMethod;
  platform?: PlatformType;
  inference_mode?: 'manual_crop' | 'suggested_crop';
  latency_ms?: number;
  latency_bucket?: LatencyBucket;
  confidence_bucket?: ConfidenceBucket;
  result_status?: 'SUCCESS' | 'REFUSED' | 'ERROR';
  production_accepted?: boolean;
  error_code?: TelemetryErrorCode;
  image_orientation?: ImageOrientation;
  crop_aspect_ratio_bucket?: CropAspectBucket;
  suggestion_count?: number;
  retry_count?: number;
  feedback?: TelemetryPredictionFeedback;
  category_predicted?: string;
  has_inferred_attributes?: boolean;
}

export interface GarmentTelemetryEvent {
  event_id: string;
  session_id: string;
  event_type: GarmentTelemetryEventType;
  timestamp: string;
  metadata: GarmentTelemetryMetadata;
}

export interface FunnelSummary {
  images_selected: number;
  selection_started: number;
  selection_confirmed: number;
  crop_created: number;
  inference_started: number;
  inference_completed: number;
  accepted: number;
  refused: number;
  errors: number;
  saved: number;
  rates: {
    selection_conversion_pct: number;
    inference_success_pct: number;
    acceptance_pct: number;
    refusal_pct: number;
    error_pct: number;
    save_conversion_pct: number;
  };
}

export interface RetrySummary {
  selection_cancel_count: number;
  selection_reset_count: number;
  inference_retry_count: number;
  refusal_retry_count: number;
  total_events: number;
}

/**
 * Utility: Maps numeric confidence to privacy-preserving coarse bucket.
 */
export function getConfidenceBucket(confidence: number): ConfidenceBucket {
  if (confidence < 0.25) return '<0.25';
  if (confidence < 0.50) return '0.25-0.49';
  if (confidence < 0.65) return '0.50-0.64';
  if (confidence < 0.80) return '0.65-0.79';
  if (confidence < 0.90) return '0.80-0.89';
  return '>=0.90';
}

/**
 * Utility: Maps numeric latency to coarse bucket.
 */
export function getLatencyBucket(ms: number): LatencyBucket {
  if (ms < 250) return '<250ms';
  if (ms < 500) return '250-500ms';
  if (ms < 1000) return '500-1000ms';
  if (ms < 2000) return '1-2s';
  return '>2s';
}

/**
 * Utility: Computes coarse orientation from source dimensions.
 */
export function getImageOrientation(width: number, height: number): ImageOrientation {
  if (width <= 0 || height <= 0) return 'square';
  const ratio = width / height;
  if (ratio > 1.15) return 'landscape';
  if (ratio < 0.85) return 'portrait';
  return 'square';
}

/**
 * Utility: Computes coarse crop aspect ratio bucket from width & height.
 */
export function getCropAspectBucket(width: number, height: number): CropAspectBucket {
  if (width <= 0 || height <= 0) return 'square';
  const ratio = width / height;
  if (ratio > 1.15) return 'wide';
  if (ratio < 0.85) return 'tall';
  return 'square';
}

/**
 * STRICT PRIVACY SANITIZATION:
 * Validates that an object contains absolutely NO banned image data,
 * paths, URIs, or base64 strings. Throws or strips if found.
 */
const BANNED_KEYS = new Set([
  'imageuri',
  'image_uri',
  'uri',
  'fileuri',
  'file_uri',
  'path',
  'filepath',
  'base64',
  'cropbitmap',
  'rawcrop',
  'pixels',
  'exif',
  'data',
]);

export function sanitizeTelemetryMetadata(metadata: Record<string, any>): GarmentTelemetryMetadata {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (BANNED_KEYS.has(lowerKey)) {
      throw new Error(`[Telemetry Privacy Violation] Banned key '${key}' detected in telemetry metadata`);
    }

    if (typeof value === 'string') {
      const lowerVal = value.toLowerCase();
      if (
        lowerVal.startsWith('file://') ||
        lowerVal.startsWith('data:image') ||
        lowerVal.startsWith('content://') ||
        lowerVal.includes('/storage/') ||
        lowerVal.includes('c:\\') ||
        lowerVal.includes('d:\\')
      ) {
        throw new Error(`[Telemetry Privacy Violation] Prohibited URI or path value detected in key '${key}'`);
      }
    }

    sanitized[key] = value;
  }

  return sanitized as GarmentTelemetryMetadata;
}
