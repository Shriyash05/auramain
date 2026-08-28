/**
 * AURA MASTER GARMENT TAXONOMY (Single Source of Truth — Version 0.2)
 * Used across Database, Mobile Client, AI Benchmark & Training Harnesses
 */

export const AURA_CATEGORIES = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'] as const;
export type AuraCategory = typeof AURA_CATEGORIES[number];

export const AURA_SUBCATEGORIES = [
  // Tops
  't_shirt',
  'overshirt',
  'button_down',
  'knit_sweater',
  'hoodie',
  'tank',
  'polo',
  // Bottoms
  'trousers',
  'pleated_pants',
  'jeans',
  'shorts',
  'sweatpants',
  // Outerwear
  'blazer',
  'trench_coat',
  'wool_coat',
  'bomber_jacket',
  'leather_jacket',
  'denim_jacket',
  'puffer_jacket',
  // Shoes
  'sneakers',
  'loafers',
  'derbies',
  'boots',
  'mules',
  'sandals',
  // Accessories
  'belt',
  'tote_bag',
  'crossbody_bag',
  'sunglasses',
  'scarf',
  'hat',
  'unknown',
] as const;
export type AuraSubcategory = typeof AURA_SUBCATEGORIES[number];

export const AURA_FITS = ['Oversized', 'Relaxed', 'Regular', 'Slim', 'Fitted', 'unknown'] as const;
export type AuraFit = typeof AURA_FITS[number];

export const AURA_SILHOUETTES = [
  'structured',
  'straight',
  'relaxed',
  'wide',
  'boxy',
  'fitted',
  'flowing',
  'unknown',
] as const;
export type AuraSilhouette = typeof AURA_SILHOUETTES[number];

export const AURA_COLOR_FAMILIES = [
  'black',
  'white',
  'cream',
  'beige',
  'brown',
  'grey',
  'navy',
  'blue',
  'green',
  'olive',
  'red',
  'pink',
  'purple',
  'yellow',
  'orange',
  'multi',
  'unknown',
] as const;
export type AuraColorFamily = typeof AURA_COLOR_FAMILIES[number];

export const AURA_PATTERNS = [
  'solid',
  'striped',
  'plaid',
  'checkered',
  'graphic',
  'floral',
  'textured',
  'houndstooth',
  'unknown',
] as const;
export type AuraPattern = typeof AURA_PATTERNS[number];

export const AURA_MATERIALS = [
  'cotton',
  'linen',
  'wool',
  'silk',
  'leather',
  'denim',
  'nylon',
  'knit',
  'suede',
  'synthetic',
  'cashmere',
  'unknown',
] as const;
export type AuraMaterial = typeof AURA_MATERIALS[number];

export const AURA_SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All Season'] as const;
export type AuraSeason = typeof AURA_SEASONS[number];

export const AURA_OCCASIONS = [
  'Casual',
  'Date Night',
  'Work / Office',
  'Evening / Event',
  'Streetwear',
  'Vacation',
  'Minimalist',
] as const;
export type AuraOccasion = typeof AURA_OCCASIONS[number];

export type AmbiguityStatus = 'KNOWN' | 'UNKNOWN' | 'AMBIGUOUS';

/**
 * Strict Annotation & Prediction Schema for aura-garment-v1 (v0.2)
 */
export interface GarmentTaxonomyLabels {
  category: AuraCategory;
  subcategory: AuraSubcategory;
  primary_color_hex: string;
  color_family: AuraColorFamily;
  fit: AuraFit;
  silhouette: AuraSilhouette;
  pattern: AuraPattern;
  material: AuraMaterial;
  formality_score: number; // 0.0 (ultra-casual) to 1.0 (black-tie formal)
  occasions: AuraOccasion[];
  seasons: AuraSeason[];
  ambiguity_status?: {
    fit?: AmbiguityStatus;
    material?: AmbiguityStatus;
    color?: AmbiguityStatus;
  };
}

export interface GarmentModelPrediction {
  model_id: string;
  version: string;
  labels: GarmentTaxonomyLabels;
  confidences: {
    category: number;
    subcategory: number;
    fit: number;
    silhouette: number;
    color_family: number;
    pattern: number;
    material: number;
    formality: number;
  };
  latency_ms: number;
  runtime_device: 'gpu_serverless' | 'local_onnx' | 'deterministic_fallback';
  calibrated: boolean;
}

// -------------------------------------------------------------
// HIERARCHICAL TAXONOMY HELPERS (v0.2)
// -------------------------------------------------------------

export function isHierarchicalFitMatch(predicted: AuraFit, expected: AuraFit): boolean {
  if (predicted === expected) return true;
  // Relaxed & Oversized share the relaxed tailoring volume branch
  if (
    (predicted === 'Relaxed' && expected === 'Oversized') ||
    (predicted === 'Oversized' && expected === 'Relaxed')
  ) {
    return true;
  }
  return false;
}

export function isHierarchicalMaterialMatch(predicted: AuraMaterial, expected: AuraMaterial): boolean {
  if (predicted === expected) return true;
  // Synthetic is parent super-class of nylon
  if (
    (predicted === 'synthetic' && expected === 'nylon') ||
    (predicted === 'nylon' && expected === 'synthetic')
  ) {
    return true;
  }
  return false;
}

export function isHierarchicalColorMatch(predicted: AuraColorFamily, expected: AuraColorFamily): boolean {
  if (predicted === expected) return true;
  // Cream and white reside in the light neutral palette branch
  if (
    (predicted === 'white' && expected === 'cream') ||
    (predicted === 'cream' && expected === 'white')
  ) {
    return true;
  }
  return false;
}
