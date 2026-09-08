/**
 * AURA Target Garment Selection & Inference Service (Phase 15)
 * ============================================================
 * Orchestrates user garment selection, finite state machine transitions,
 * optional heuristic suggestions (with override protection), crop validation,
 * and calibrated inference through the Exp-0015 / deterministic model router.
 */

import {
  GarmentSelection,
  GarmentSelectionState,
  SuggestedGarmentRegion,
  GarmentInferenceRequest,
  GarmentInferenceResult,
  BoundingBoxCoordinates,
  SelectionMethod,
} from './types';
import { CropService } from './cropService';
import { garmentLocalizationService } from '../garment-localization';
import { auraGarmentModel } from '../garment-ai/auraGarmentModel';
import { AuraCategory } from '../../types/garmentTaxonomy';

export class GarmentSelectionService {
  public static readonly CONFIDENCE_REFUSAL_THRESHOLD = 0.65;
  public static readonly MODEL_VERSION = 'aura-garment-v1-exp0015';
  public static readonly MODEL_STAGE = 'EXPERIMENTAL'; // Section 1 & 33 rule: Never promote without verification

  private currentState: GarmentSelectionState = 'IDLE';
  private currentSelection: GarmentSelection | null = null;
  private suggestedRegions: SuggestedGarmentRegion[] = [];
  private activeImageUri: string | null = null;
  private imageDimensions: { width: number; height: number } = { width: 0, height: 0 };

  /**
   * Current FSM state.
   */
  public getState(): GarmentSelectionState {
    return this.currentState;
  }

  /**
   * Current active selection.
   */
  public getSelection(): GarmentSelection | null {
    return this.currentSelection;
  }

  /**
   * Initializes the selection workflow with a chosen image.
   */
  public initializeWithImage(imageUri: string, sourceWidth: number, sourceHeight: number): void {
    if (!imageUri) {
      throw new Error('[GarmentSelectionService] Image URI cannot be empty');
    }
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error(`[GarmentSelectionService] Invalid image dimensions: ${sourceWidth}x${sourceHeight}`);
    }

    this.activeImageUri = imageUri;
    this.imageDimensions = { width: sourceWidth, height: sourceHeight };
    this.currentSelection = null;
    this.suggestedRegions = [];
    this.currentState = 'IMAGE_SELECTED';
  }

  /**
   * Generates optional automatic garment suggestions.
   * STRICT RULE: Labeled as "SUGGESTED GARMENT", never silently overrides user selection.
   */
  public async loadAutomaticSuggestions(options?: { minConfidence?: number }): Promise<SuggestedGarmentRegion[]> {
    if (!this.activeImageUri) {
      throw new Error('[GarmentSelectionService] No active image loaded');
    }

    const proposals = await garmentLocalizationService.localizeGarments(this.activeImageUri, {
      maxProposals: 4,
      minConfidence: options?.minConfidence ?? 0.5,
    });

    this.suggestedRegions = proposals.map((p, idx) => ({
      id: `suggestion_${idx + 1}`,
      label: 'SUGGESTED GARMENT',
      bbox: {
        x: p.bbox.x,
        y: p.bbox.y,
        width: p.bbox.width,
        height: p.bbox.height,
      },
      confidence: p.confidence,
      categoryHint: p.category_hint,
    }));

    return this.suggestedRegions;
  }

  /**
   * Applies an explicit user manual selection (Mode A).
   * Overrides any active suggestion with the user's authoritative choice.
   */
  public setManualSelection(
    bbox: BoundingBoxCoordinates,
    space: 'normalized' | 'pixel' = 'normalized',
    paddingPct: number = CropService.DEFAULT_PADDING_PCT
  ): GarmentSelection {
    if (!this.activeImageUri) {
      throw new Error('[GarmentSelectionService] No active image loaded');
    }

    const validation = CropService.validateBoundingBox(
      bbox,
      space,
      this.imageDimensions.width,
      this.imageDimensions.height
    );

    const normBox = CropService.toNormalized(
      validation.clampedBox,
      space,
      this.imageDimensions.width,
      this.imageDimensions.height
    );

    this.currentSelection = {
      imageUri: this.activeImageUri,
      bbox: normBox,
      coordinateSpace: 'normalized',
      sourceWidth: this.imageDimensions.width,
      sourceHeight: this.imageDimensions.height,
      cropPadding: paddingPct,
      selectionMethod: 'manual',
      timestamp: new Date().toISOString(),
    };

    this.currentState = 'REGION_SELECTED';
    return this.currentSelection;
  }

  /**
   * Applies an optional suggestion chosen by the user (Mode B).
   * User explicitly taps the suggested region to confirm it.
   */
  public applySuggestedSelection(
    suggestionId: string,
    paddingPct: number = CropService.DEFAULT_PADDING_PCT
  ): GarmentSelection {
    if (!this.activeImageUri) {
      throw new Error('[GarmentSelectionService] No active image loaded');
    }

    const target = this.suggestedRegions.find((r) => r.id === suggestionId);
    if (!target) {
      throw new Error(`[GarmentSelectionService] Suggestion id '${suggestionId}' not found`);
    }

    const normBox = CropService.clampNormalized(target.bbox);

    this.currentSelection = {
      imageUri: this.activeImageUri,
      bbox: normBox,
      coordinateSpace: 'normalized',
      sourceWidth: this.imageDimensions.width,
      sourceHeight: this.imageDimensions.height,
      cropPadding: paddingPct,
      selectionMethod: 'suggested',
      timestamp: new Date().toISOString(),
    };

    this.currentState = 'REGION_SELECTED';
    return this.currentSelection;
  }

  /**
   * Resets active selection to SELECTING_REGION.
   */
  public resetSelection(): void {
    this.currentSelection = null;
    this.currentState = this.activeImageUri ? 'SELECTING_REGION' : 'IDLE';
  }

  /**
   * Cancels selection flow.
   */
  public cancel(): void {
    this.currentSelection = null;
    this.suggestedRegions = [];
    this.activeImageUri = null;
    this.currentState = 'CANCELED';
  }

  /**
   * Executes inference on the target selected garment.
   * Respects confidence refusal gate (< 0.65) and fallback safety.
   */
  public async executeInference(request?: GarmentInferenceRequest): Promise<GarmentInferenceResult> {
    const startTime = Date.now();
    const selection = request?.selection || this.currentSelection;

    if (!selection) {
      this.currentState = 'ERROR';
      return {
        status: 'ERROR',
        category: 'unknown',
        confidence: 0,
        attributes: { category: 'unknown' },
        modelVersion: GarmentSelectionService.MODEL_VERSION,
        selectionMethod: 'manual',
        bbox: { x: 0, y: 0, width: 0, height: 0 },
        latency: { crop_ms: 0, inference_ms: 0, total_ms: Date.now() - startTime },
        error: 'No target garment region selected',
      };
    }

    this.currentState = 'PROCESSING';

    // 1. Validate and apply crop padding
    const cropStart = Date.now();
    const paddedBox = CropService.applyCropPadding(
      selection.bbox,
      selection.cropPadding,
      'normalized',
      selection.sourceWidth,
      selection.sourceHeight
    );
    const cropElapsed = Date.now() - cropStart;

    this.currentState = 'CLASSIFYING';

    // 2. Execute model inference through AuraGarmentModel adapter
    const inferenceStart = Date.now();
    try {
      const modelResult = await auraGarmentModel.predictAttributes(selection.imageUri);
      const inferenceElapsed = Date.now() - inferenceStart;
      const totalElapsed = Date.now() - startTime;

      const rawCategory = modelResult.labels.category as AuraCategory;
      const confidence = modelResult.confidences.category;

      // 3. Confidence Gate Evaluation (< 0.65 -> REFUSED)
      if (confidence < GarmentSelectionService.CONFIDENCE_REFUSAL_THRESHOLD) {
        this.currentState = 'REFUSED';
        return {
          status: 'REFUSED',
          category: 'unknown',
          confidence: Number(confidence.toFixed(4)),
          attributes: {
            category: 'unknown',
            subcategory: 'unknown',
            color_family: 'unknown',
            fit: 'unknown',
            silhouette: 'unknown',
            pattern: 'unknown',
            material: 'unknown',
          },
          modelVersion: GarmentSelectionService.MODEL_VERSION,
          selectionMethod: selection.selectionMethod,
          bbox: paddedBox,
          latency: {
            crop_ms: cropElapsed,
            inference_ms: inferenceElapsed,
            total_ms: totalElapsed,
          },
          refusalReason: `Category confidence (${(confidence * 100).toFixed(1)}%) below minimum threshold (65.0%)`,
        };
      }

      // 4. Accepted Classification
      this.currentState = 'SUCCESS';
      return {
        status: 'SUCCESS',
        category: rawCategory,
        confidence: Number(confidence.toFixed(4)),
        attributes: {
          category: rawCategory,
          subcategory: modelResult.labels.subcategory,
          color_family: modelResult.labels.color_family,
          fit: modelResult.labels.fit,
          silhouette: modelResult.labels.silhouette,
          pattern: modelResult.labels.pattern,
          material: modelResult.labels.material,
          formality_score: modelResult.labels.formality_score,
          occasions: modelResult.labels.occasions,
          seasons: modelResult.labels.seasons,
        },
        modelVersion: GarmentSelectionService.MODEL_VERSION,
        selectionMethod: selection.selectionMethod,
        bbox: paddedBox,
        latency: {
          crop_ms: cropElapsed,
          inference_ms: inferenceElapsed,
          total_ms: totalElapsed,
        },
      };
    } catch (err: any) {
      this.currentState = 'ERROR';
      const inferenceElapsed = Date.now() - inferenceStart;
      return {
        status: 'ERROR',
        category: 'unknown',
        confidence: 0,
        attributes: { category: 'unknown' },
        modelVersion: GarmentSelectionService.MODEL_VERSION,
        selectionMethod: selection.selectionMethod,
        bbox: paddedBox,
        latency: {
          crop_ms: cropElapsed,
          inference_ms: inferenceElapsed,
          total_ms: Date.now() - startTime,
        },
        error: err?.message || 'Model inference failure',
      };
    }
  }
}

export const garmentSelectionService = new GarmentSelectionService();
