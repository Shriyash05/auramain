/**
 * AURA Garment Telemetry Service (Phase 15C)
 * ==========================================
 * Singleton orchestrator for tracking production wardrobe-creation events,
 * calculating conversion funnels, computing retry metrics, and strictly enforcing
 * zero-image privacy guarantees.
 */

import { Platform } from 'react-native';
import {
  GarmentTelemetryEvent,
  GarmentTelemetryEventType,
  GarmentTelemetryMetadata,
  FunnelSummary,
  RetrySummary,
  PlatformType,
  getConfidenceBucket,
  getLatencyBucket,
  getImageOrientation,
  getCropAspectBucket,
  sanitizeTelemetryMetadata,
} from './types';
import { ITelemetryProvider, LocalStorageTelemetryProvider } from './telemetryProvider';

export class GarmentTelemetryService {
  private static instance: GarmentTelemetryService;
  public static readonly MODEL_VERSION = 'aura-garment-v1-exp0015';

  private provider: ITelemetryProvider;
  private currentSessionId: string;

  public constructor(provider?: ITelemetryProvider) {
    this.provider = provider || new LocalStorageTelemetryProvider();
    this.currentSessionId = 'sess_' + Math.random().toString(36).substring(2, 9);
  }

  public static getInstance(): GarmentTelemetryService {
    if (!GarmentTelemetryService.instance) {
      GarmentTelemetryService.instance = new GarmentTelemetryService();
    }
    return GarmentTelemetryService.instance;
  }

  /**
   * Allows injecting a custom provider (e.g. MockTelemetryProvider in tests).
   */
  public setProvider(provider: ITelemetryProvider): void {
    this.provider = provider;
  }

  public startNewSession(): string {
    this.currentSessionId = 'sess_' + Math.random().toString(36).substring(2, 9);
    return this.currentSessionId;
  }

  public getSessionId(): string {
    return this.currentSessionId;
  }

  private detectPlatform(): PlatformType {
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    return 'web';
  }

  /**
   * Emits a privacy-sanitized telemetry event to the configured provider.
   */
  public async emitEvent(
    eventType: GarmentTelemetryEventType,
    metadata: GarmentTelemetryMetadata = {}
  ): Promise<GarmentTelemetryEvent> {
    // 1. Enforce privacy sanitization (throws on any imageUri, path, or base64)
    const sanitizedMeta = sanitizeTelemetryMetadata(metadata);

    // 2. Inject standard baseline metadata
    const completeMetadata: GarmentTelemetryMetadata = {
      platform: this.detectPlatform(),
      model_version: GarmentTelemetryService.MODEL_VERSION,
      ...sanitizedMeta,
    };

    const event: GarmentTelemetryEvent = {
      event_id: 'evt_' + Math.random().toString(36).substring(2, 11),
      session_id: this.currentSessionId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      metadata: completeMetadata,
    };

    await this.provider.recordEvent(event);
    return event;
  }

  // --- High-Level Typed Event Helpers ---

  public async trackImageSelected(sourceWidth: number, sourceHeight: number): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_IMAGE_SELECTED', {
      image_orientation: getImageOrientation(sourceWidth, sourceHeight),
    });
  }

  public async trackSelectionStarted(sourceWidth: number, sourceHeight: number): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_SELECTION_STARTED', {
      image_orientation: getImageOrientation(sourceWidth, sourceHeight),
    });
  }

  public async trackSelectionConfirmed(
    method: 'manual' | 'suggested' | 'suggested_then_manual',
    cropWidth: number,
    cropHeight: number
  ): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_SELECTION_CONFIRMED', {
      selection_method: method,
      crop_aspect_ratio_bucket: getCropAspectBucket(cropWidth, cropHeight),
    });
  }

  public async trackSelectionCanceled(reason?: string): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_SELECTION_CANCELED', {
      error_code: 'USER_CANCELLED',
    });
  }

  public async trackSelectionReset(): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_SELECTION_RESET');
  }

  public async trackSuggestionsShown(count: number): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_SUGGESTION_SHOWN', {
      suggestion_count: count,
    });
  }

  public async trackSuggestionAccepted(categoryHint?: string): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_SUGGESTION_ACCEPTED', {
      selection_method: 'suggested',
      category_predicted: categoryHint,
    });
  }

  public async trackSuggestionOverridden(): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_SUGGESTION_OVERRIDDEN', {
      selection_method: 'suggested_then_manual',
    });
  }

  public async trackCropCreated(cropWidth: number, cropHeight: number): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_CROP_CREATED', {
      crop_aspect_ratio_bucket: getCropAspectBucket(cropWidth, cropHeight),
    });
  }

  public async trackInferenceStarted(
    mode: 'manual_crop' | 'suggested_crop',
    method: 'manual' | 'suggested' | 'suggested_then_manual'
  ): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_INFERENCE_STARTED', {
      inference_mode: mode,
      selection_method: method,
    });
  }

  /**
   * Tracks successful model inference.
   * Note: Separate from production_accepted. If confidence is >=0.65, production_accepted is true.
   */
  public async trackInferenceSuccess(params: {
    confidence: number;
    latencyMs: number;
    cropWidth: number;
    cropHeight: number;
    selectionMethod: 'manual' | 'suggested' | 'suggested_then_manual';
    category?: string;
  }): Promise<GarmentTelemetryEvent> {
    const isAccepted = params.confidence >= 0.65;
    return this.emitEvent('GARMENT_INFERENCE_SUCCESS', {
      result_status: 'SUCCESS',
      production_accepted: isAccepted,
      confidence_bucket: getConfidenceBucket(params.confidence),
      latency_ms: params.latencyMs,
      latency_bucket: getLatencyBucket(params.latencyMs),
      crop_aspect_ratio_bucket: getCropAspectBucket(params.cropWidth, params.cropHeight),
      selection_method: params.selectionMethod,
      category_predicted: params.category,
    });
  }

  /**
   * Tracks confidence refusal (< 0.65).
   * Note: result_status is 'REFUSED' and production_accepted is false.
   */
  public async trackInferenceRefused(params: {
    confidence: number;
    latencyMs: number;
    cropWidth: number;
    cropHeight: number;
    selectionMethod: 'manual' | 'suggested' | 'suggested_then_manual';
  }): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_INFERENCE_REFUSED', {
      result_status: 'REFUSED',
      production_accepted: false,
      confidence_bucket: getConfidenceBucket(params.confidence),
      latency_ms: params.latencyMs,
      latency_bucket: getLatencyBucket(params.latencyMs),
      crop_aspect_ratio_bucket: getCropAspectBucket(params.cropWidth, params.cropHeight),
      selection_method: params.selectionMethod,
    });
  }

  public async trackInferenceError(errorCode: any, latencyMs?: number): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_INFERENCE_ERROR', {
      result_status: 'ERROR',
      production_accepted: false,
      error_code: errorCode,
      latency_ms: latencyMs,
      latency_bucket: latencyMs ? getLatencyBucket(latencyMs) : undefined,
    });
  }

  public async trackSaveSuccess(hasInferredAttributes: boolean): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_SAVE_SUCCESS', {
      has_inferred_attributes: hasInferredAttributes,
    });
  }

  public async trackPredictionFeedback(
    feedback: 'CORRECT' | 'INCORRECT' | 'NOT_SURE',
    predictedCategory?: string
  ): Promise<GarmentTelemetryEvent> {
    return this.emitEvent('GARMENT_PREDICTION_FEEDBACK', {
      feedback,
      category_predicted: predictedCategory,
    });
  }

  // --- Funnel & Aggregation Analytics ---

  public async getEvents(): Promise<GarmentTelemetryEvent[]> {
    return this.provider.getEvents();
  }

  public async clearEvents(): Promise<void> {
    return this.provider.clearEvents();
  }

  public async computeFunnelSummary(): Promise<FunnelSummary> {
    const events = await this.provider.getEvents();

    let images_selected = 0;
    let selection_started = 0;
    let selection_confirmed = 0;
    let crop_created = 0;
    let inference_started = 0;
    let accepted = 0;
    let refused = 0;
    let errors = 0;
    let saved = 0;

    for (const e of events) {
      switch (e.event_type) {
        case 'GARMENT_IMAGE_SELECTED':
          images_selected++;
          break;
        case 'GARMENT_SELECTION_STARTED':
          selection_started++;
          break;
        case 'GARMENT_SELECTION_CONFIRMED':
          selection_confirmed++;
          break;
        case 'GARMENT_CROP_CREATED':
          crop_created++;
          break;
        case 'GARMENT_INFERENCE_STARTED':
          inference_started++;
          break;
        case 'GARMENT_INFERENCE_SUCCESS':
          if (e.metadata.production_accepted) {
            accepted++;
          } else {
            refused++;
          }
          break;
        case 'GARMENT_INFERENCE_REFUSED':
          refused++;
          break;
        case 'GARMENT_INFERENCE_ERROR':
          errors++;
          break;
        case 'GARMENT_SAVE_SUCCESS':
          saved++;
          break;
      }
    }

    const inference_completed = accepted + refused + errors;

    const selection_conversion_pct = images_selected > 0 ? Number(((selection_confirmed / images_selected) * 100).toFixed(1)) : 0;
    const inference_success_pct = inference_started > 0 ? Number(((accepted / inference_started) * 100).toFixed(1)) : 0;
    const acceptance_pct = inference_completed > 0 ? Number(((accepted / inference_completed) * 100).toFixed(1)) : 0;
    const refusal_pct = inference_completed > 0 ? Number(((refused / inference_completed) * 100).toFixed(1)) : 0;
    const error_pct = inference_completed > 0 ? Number(((errors / inference_completed) * 100).toFixed(1)) : 0;
    const save_conversion_pct = images_selected > 0 ? Number(((saved / images_selected) * 100).toFixed(1)) : 0;

    return {
      images_selected,
      selection_started,
      selection_confirmed,
      crop_created,
      inference_started,
      inference_completed,
      accepted,
      refused,
      errors,
      saved,
      rates: {
        selection_conversion_pct,
        inference_success_pct,
        acceptance_pct,
        refusal_pct,
        error_pct,
        save_conversion_pct,
      },
    };
  }

  public async computeRetrySummary(): Promise<RetrySummary> {
    const events = await this.provider.getEvents();

    let selection_cancel_count = 0;
    let selection_reset_count = 0;
    let inference_retry_count = 0;
    let refusal_retry_count = 0;

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.event_type === 'GARMENT_SELECTION_CANCELED') selection_cancel_count++;
      if (e.event_type === 'GARMENT_SELECTION_RESET') selection_reset_count++;

      // Inference retry: started event shortly after an error or refusal
      if (e.event_type === 'GARMENT_INFERENCE_STARTED' && i > 0) {
        const prev = events[i - 1];
        if (prev.event_type === 'GARMENT_INFERENCE_ERROR') inference_retry_count++;
        if (prev.event_type === 'GARMENT_INFERENCE_REFUSED') refusal_retry_count++;
      }
    }

    return {
      selection_cancel_count,
      selection_reset_count,
      inference_retry_count,
      refusal_retry_count,
      total_events: events.length,
    };
  }
}

export const garmentTelemetryService = GarmentTelemetryService.getInstance();
