/**
 * Garment Presentation Service
 * 
 * Manages clean visual garment representations and image source priority:
 * 1. Clean product/catalog image already available -> prefer preserving that representation.
 * 2. User provides a lifestyle/person photo -> isolate garment from image via manual/automatic bounding crop.
 * 3. Background removal / isolation uncertain -> reliable manual target selection fallback.
 * 4. Never fabricate garment appearance or substitute generic fashion assets.
 * 
 * SCIENTIFIC GOVERNANCE NOTE:
 * aura-garment-v1-exp0015 is a garment classification/tagging system.
 * It is NOT a dedicated background-removal / segmentation model.
 * This service provides the clear domain abstraction for garment presentation
 * without making unverified claims of production-grade automatic segmentation.
 */

import { Garment } from '../../types/garment';

export type GarmentImageSourceType =
  | 'product_catalog'
  | 'lifestyle_isolated'
  | 'manual_selection'
  | 'original_unprocessed';

export interface GarmentPresentationAsset {
  garmentId: string;
  displayUri: string;
  sourceType: GarmentImageSourceType;
  isIsolated: boolean;
  isolationMethod: 'preserved_catalog' | 'manual_crop' | 'bounding_box' | 'raw_photo';
  metadata: {
    hasCleanBackground: boolean;
    aspectRatio: number;
    cropCoordinates?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export class GarmentPresentationService {
  /**
   * Resolves the primary visual representation of a garment following the priority hierarchy:
   * 1. Preserved clean processed crop (if available)
   * 2. Original user image
   */
  static getDisplayImageUri(garment: Garment): string {
    return garment.processed_image || garment.original_image || '';
  }

  /**
   * Determines the image presentation asset details and isolation method
   */
  static resolvePresentationAsset(
    garment: Garment,
    explicitSource?: GarmentImageSourceType
  ): GarmentPresentationAsset {
    const hasProcessed = Boolean(garment.processed_image && garment.processed_image !== garment.original_image);
    
    let sourceType: GarmentImageSourceType = explicitSource || 'original_unprocessed';
    let isolationMethod: GarmentPresentationAsset['isolationMethod'] = 'raw_photo';
    let isIsolated = false;

    if (explicitSource === 'product_catalog') {
      sourceType = 'product_catalog';
      isolationMethod = 'preserved_catalog';
      isIsolated = true;
    } else if (hasProcessed) {
      sourceType = 'lifestyle_isolated';
      isolationMethod = 'manual_crop';
      isIsolated = true;
    } else {
      sourceType = 'manual_selection';
      isolationMethod = 'bounding_box';
      isIsolated = false;
    }

    return {
      garmentId: garment.id,
      displayUri: this.getDisplayImageUri(garment),
      sourceType,
      isIsolated,
      isolationMethod,
      metadata: {
        hasCleanBackground: sourceType === 'product_catalog',
        aspectRatio: 1.0,
      },
    };
  }

  /**
   * Validates whether a garment asset preserves the user's authentic wardrobe appearance
   */
  static validateAuthenticity(garment: Garment): { isAuthentic: boolean; reason: string } {
    if (!garment.original_image && !garment.processed_image) {
      return { isAuthentic: false, reason: 'Garment lacks any authenticated photo uri' };
    }
    // Disallow placeholder generic links
    const uris = [garment.processed_image, garment.original_image].filter(Boolean).map((u) => (u || '').toLowerCase());
    if (uris.some((u) => u.includes('generic_placeholder') || u.includes('stock_fashion_model'))) {
      return { isAuthentic: false, reason: 'Generic stock imagery is forbidden in user personal wardrobe' };
    }
    return { isAuthentic: true, reason: 'Authentic user wardrobe asset verified' };
  }
}

export const garmentPresentationService = GarmentPresentationService;
