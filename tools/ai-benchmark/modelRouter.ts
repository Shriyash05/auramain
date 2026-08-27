import {
  IGarmentVisionModel,
  IGarmentSegmentationModel,
  IInspirationVisionModel,
  IIntentModel,
  IVirtualTryOnModel,
  GarmentAttributeResult,
  SegmentationResult,
  InspirationExtractionResult,
  StructuredIntentResult,
  VirtualTryOnResult,
} from './types';

export class AuraModelRouter {
  private static garmentModel?: IGarmentVisionModel;
  private static segmentationModel?: IGarmentSegmentationModel;
  private static inspirationModel?: IInspirationVisionModel;
  private static intentModel?: IIntentModel;
  private static vtoModel?: IVirtualTryOnModel;

  public static registerGarmentModel(model: IGarmentVisionModel) {
    this.garmentModel = model;
  }

  public static registerSegmentationModel(model: IGarmentSegmentationModel) {
    this.segmentationModel = model;
  }

  public static registerInspirationModel(model: IInspirationVisionModel) {
    this.inspirationModel = model;
  }

  public static registerIntentModel(model: IIntentModel) {
    this.intentModel = model;
  }

  public static registerVtoModel(model: IVirtualTryOnModel) {
    this.vtoModel = model;
  }

  /**
   * Routes Garment Attribute Extraction with Deterministic Fallback
   */
  public static async routeGarmentExtraction(imageUri: string): Promise<GarmentAttributeResult> {
    if (this.garmentModel) {
      try {
        return await this.garmentModel.extractAttributes(imageUri);
      } catch (e) {
        console.warn(`[AuraModelRouter] ${this.garmentModel.modelId} failed, falling back to heuristic:`, e);
      }
    }

    // Default Fallback
    return {
      category: 'tops',
      primary_color: '#F0EFEA',
      fit: 'Relaxed',
      season: ['All Season'],
      occasion: ['Casual'],
      formality_score: 0.5,
      confidence: 0.6,
    };
  }

  /**
   * Routes Garment Segmentation with Fallback
   */
  public static async routeSegmentation(imageUri: string): Promise<SegmentationResult> {
    if (this.segmentationModel) {
      try {
        return await this.segmentationModel.segmentGarment(imageUri);
      } catch (e) {
        console.warn(`[AuraModelRouter] Segmentation failed, falling back:`, e);
      }
    }

    return {
      cutout_png_uri: imageUri,
      foreground_ratio: 0.85,
      latency_ms: 0,
    };
  }

  /**
   * Routes Natural Language Intent Parsing with Fallback
   */
  public static async routeIntent(userPrompt: string): Promise<StructuredIntentResult> {
    if (this.intentModel) {
      try {
        return await this.intentModel.parseNaturalLanguageIntent(userPrompt);
      } catch (e) {
        console.warn(`[AuraModelRouter] Intent parsing model failed, falling back:`, e);
      }
    }

    // Heuristic Regex Fallback
    const p = userPrompt.toLowerCase();
    if (p.includes('casual')) {
      return {
        intent: 'MODIFY_OUTFIT',
        constraints: { target_vibe: 'Casual' },
        confidence: 0.8,
        latency_ms: 2,
      };
    }
    if (p.includes('dinner') || p.includes('evening')) {
      return {
        intent: 'RECOMMEND_FOR_OCCASION',
        constraints: { occasion: 'Evening / Event' },
        confidence: 0.85,
        latency_ms: 2,
      };
    }

    return {
      intent: 'SEARCH_WARDROBE',
      constraints: {},
      confidence: 0.5,
      latency_ms: 1,
    };
  }
}
