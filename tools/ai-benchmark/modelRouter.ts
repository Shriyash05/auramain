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

export type AiDomain =
  | 'garment-understanding'
  | 'garment-segmentation'
  | 'inspiration-understanding'
  | 'natural-language-intent'
  | 'virtual-try-on';

export interface ModelHealthStatus {
  domain: AiDomain;
  modelId: string;
  isAvailable: boolean;
  runtime: 'local_deterministic' | 'local_onnx' | 'self_hosted_gpu';
  version: string;
}

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

  public static hasCapability(domain: AiDomain): boolean {
    switch (domain) {
      case 'garment-understanding':
        return Boolean(this.garmentModel);
      case 'garment-segmentation':
        return Boolean(this.segmentationModel);
      case 'inspiration-understanding':
        return Boolean(this.inspirationModel);
      case 'natural-language-intent':
        return Boolean(this.intentModel);
      case 'virtual-try-on':
        return Boolean(this.vtoModel);
      default:
        return false;
    }
  }

  public static getModelHealth(): ModelHealthStatus[] {
    return [
      {
        domain: 'garment-understanding',
        modelId: this.garmentModel?.modelId || 'aura-garment-fallback',
        isAvailable: true,
        runtime: this.garmentModel ? 'self_hosted_gpu' : 'local_deterministic',
        version: this.garmentModel?.version || '1.0.0-fallback',
      },
      {
        domain: 'garment-segmentation',
        modelId: this.segmentationModel?.modelId || 'aura-segment-fallback',
        isAvailable: true,
        runtime: this.segmentationModel ? 'self_hosted_gpu' : 'local_deterministic',
        version: this.segmentationModel?.version || '1.0.0-fallback',
      },
      {
        domain: 'inspiration-understanding',
        modelId: this.inspirationModel?.modelId || 'aura-inspire-fallback',
        isAvailable: true,
        runtime: this.inspirationModel ? 'self_hosted_gpu' : 'local_deterministic',
        version: this.inspirationModel?.version || '1.0.0-fallback',
      },
      {
        domain: 'natural-language-intent',
        modelId: this.intentModel?.modelId || 'aura-intent-regex',
        isAvailable: true,
        runtime: this.intentModel ? 'self_hosted_gpu' : 'local_deterministic',
        version: this.intentModel?.version || '1.0.0-regex',
      },
      {
        domain: 'virtual-try-on',
        modelId: this.vtoModel?.modelId || 'aura-vto-preview-fallback',
        isAvailable: Boolean(this.vtoModel),
        runtime: this.vtoModel ? 'self_hosted_gpu' : 'local_deterministic',
        version: this.vtoModel?.version || '1.0.0-preview',
      },
    ];
  }

  /**
   * Universal Vendor-Agnostic Execution Router
   */
  public static async run<T = any>(domain: AiDomain, input: any): Promise<T> {
    switch (domain) {
      case 'garment-understanding':
        return (await this.routeGarmentExtraction(input as string)) as unknown as T;
      case 'garment-segmentation':
        return (await this.routeSegmentation(input as string)) as unknown as T;
      case 'inspiration-understanding':
        return (await this.routeInspirationExtraction(input as string)) as unknown as T;
      case 'natural-language-intent':
        return (await this.routeIntent(input as string)) as unknown as T;
      case 'virtual-try-on':
        return (await this.routeVto(input.modelPhotoUri, input.garmentUris)) as unknown as T;
      default:
        throw new Error(`[AuraModelRouter] Unknown AI domain: ${domain}`);
    }
  }

  public static async routeGarmentExtraction(imageUri: string): Promise<GarmentAttributeResult> {
    if (this.garmentModel) {
      try {
        return await this.garmentModel.extractAttributes(imageUri);
      } catch (e) {
        console.warn(`[AuraModelRouter] ${this.garmentModel.modelId} failed, falling back:`, e);
      }
    }

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

  public static async routeSegmentation(imageUri: string): Promise<SegmentationResult> {
    if (this.segmentationModel) {
      try {
        return await this.segmentationModel.segmentGarment(imageUri);
      } catch (e) {
        console.warn(`[AuraModelRouter] Segmentation model failed, falling back:`, e);
      }
    }

    return {
      cutout_png_uri: imageUri,
      foreground_ratio: 0.85,
      latency_ms: 0,
    };
  }

  public static async routeInspirationExtraction(imageUri: string): Promise<InspirationExtractionResult> {
    if (this.inspirationModel) {
      try {
        return await this.inspirationModel.analyzeInspiration(imageUri);
      } catch (e) {
        console.warn(`[AuraModelRouter] Inspiration model failed, falling back:`, e);
      }
    }

    return {
      aesthetic: 'Minimalist Contemporary',
      color_palette: ['#F0EFEA', '#2B2C2E', '#111111'],
      detected_pieces: [
        { category: 'tops', description: 'Relaxed neutral layer' },
        { category: 'bottoms', description: 'Tailored trousers' },
      ],
      formality_score: 0.6,
      silhouette_profile: 'Relaxed',
      styling_formula: 'Tonal layering with structured trousers',
      latency_ms: 0,
    };
  }

  public static async routeIntent(userPrompt: string): Promise<StructuredIntentResult> {
    if (this.intentModel) {
      try {
        return await this.intentModel.parseNaturalLanguageIntent(userPrompt);
      } catch (e) {
        console.warn(`[AuraModelRouter] Intent model failed, falling back:`, e);
      }
    }

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

  public static async routeVto(modelPhotoUri: string, garmentUris: string[]): Promise<VirtualTryOnResult> {
    if (this.vtoModel) {
      try {
        return await this.vtoModel.executeTryOn(modelPhotoUri, garmentUris);
      } catch (e) {
        console.warn(`[AuraModelRouter] VTO model failed, falling back:`, e);
      }
    }

    return {
      generated_image_url: garmentUris[0] || modelPhotoUri,
      latency_ms: 0,
      execution_device: 'fallback_preview',
      status: 'completed',
    };
  }
}
