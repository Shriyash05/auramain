export interface GarmentAttributeResult {
  category: 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories';
  subcategory?: string;
  primary_color: string;
  secondary_color?: string;
  fit: 'Oversized' | 'Relaxed' | 'Regular' | 'Slim' | 'Fitted';
  pattern?: string;
  material?: string;
  season: string[];
  occasion: string[];
  formality_score: number;
  confidence: number;
}

export interface SegmentationResult {
  mask_png_base64?: string;
  cutout_png_url?: string;
  cutout_png_uri?: string;
  foreground_ratio: number;
  latency_ms: number;
}

export interface InspirationExtractionResult {
  aesthetic: string;
  color_palette: string[];
  detected_pieces: Array<{
    category: string;
    description: string;
    fit?: string;
    color?: string;
  }>;
  formality_score: number;
  silhouette_profile: string;
  styling_formula: string;
  latency_ms: number;
}

export interface StructuredIntentResult {
  intent: 'MODIFY_OUTFIT' | 'SEARCH_WARDROBE' | 'CREATE_OUTFIT' | 'RECOMMEND_FOR_OCCASION' | 'UNKNOWN';
  target_category?: string;
  constraints: {
    target_vibe?: string;
    occasion?: string;
    specific_garment_id?: string;
    color?: string;
    fit?: string;
  };
  requested_count?: number;
  confidence: number;
  latency_ms: number;
}

export interface VirtualTryOnResult {
  generated_image_url: string;
  latency_ms: number;
  execution_device: 'gpu_serverless' | 'local_gpu' | 'fallback_preview';
  status: 'completed' | 'failed';
  error_message?: string;
}

// -------------------------------------------------------------
// STANDARDIZED VENDOR-AGNOSTIC MODEL INTERFACES
// -------------------------------------------------------------

export interface IGarmentVisionModel {
  readonly modelId: string;
  readonly version: string;
  extractAttributes(imageUri: string): Promise<GarmentAttributeResult>;
}

export interface IGarmentSegmentationModel {
  readonly modelId: string;
  readonly version: string;
  segmentGarment(imageUri: string): Promise<SegmentationResult>;
}

export interface IInspirationVisionModel {
  readonly modelId: string;
  readonly version: string;
  analyzeInspiration(imageUri: string): Promise<InspirationExtractionResult>;
}

export interface IIntentModel {
  readonly modelId: string;
  readonly version: string;
  parseNaturalLanguageIntent(userPrompt: string): Promise<StructuredIntentResult>;
}

export interface IVirtualTryOnModel {
  readonly modelId: string;
  readonly version: string;
  executeTryOn(userModelPhotoUri: string, garmentImageUris: string[]): Promise<VirtualTryOnResult>;
}
