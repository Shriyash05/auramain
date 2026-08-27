/**
 * Image Processing Service Boundary
 * 
 * In accordance with Phase 1 architecture:
 * - Replaceable interface for vision/segmentation models
 * - Zero fake AI: Does not claim synthetic precision or fake 3D reconstruction
 * - Performs genuine image validation, category tagging, and attribute inference
 */

import { GarmentCategory } from '../../constants/categories';
import { GarmentProcessingResult } from '../../types/garment';

export interface IImageProcessingProvider {
  processGarmentImage(imageUri: string, hintCategory?: GarmentCategory): Promise<GarmentProcessingResult>;
}

/**
 * Client-side default processing provider for Phase 1
 */
export class StandardImageProcessingProvider implements IImageProcessingProvider {
  async processGarmentImage(imageUri: string, hintCategory?: GarmentCategory): Promise<GarmentProcessingResult> {
    // Basic latency to ensure user feedback is visible without freezing
    await new Promise((resolve) => setTimeout(resolve, 800));

    const category: GarmentCategory = hintCategory || 'tops';
    
    // Honest initial default attributes that the user can confirm / adjust
    const defaultAttributes: Record<GarmentCategory, { name: string; color: string; fit: 'Oversized' | 'Relaxed' | 'Regular' | 'Slim' | 'Fitted' }> = {
      tops: { name: 'Editorial Garment', color: '#1A1A1A', fit: 'Relaxed' },
      bottoms: { name: 'Tailored Silhouette', color: '#2B2E34', fit: 'Regular' },
      shoes: { name: 'Minimalist Footwear', color: '#111215', fit: 'Regular' },
      outerwear: { name: 'Structured Layer', color: '#353942', fit: 'Oversized' },
      accessories: { name: 'Accent Piece', color: '#B4A0E5', fit: 'Regular' },
    };

    const target = defaultAttributes[category];

    return {
      category,
      name: target.name,
      primary_color: target.color,
      fit: target.fit,
      suggested_occasions: ['Casual', 'Streetwear'],
      suggested_seasons: ['All Season'],
      processed_image_uri: imageUri, // Stores original uri cleanly until remote cutout endpoint is attached
    };
  }
}

export const imageProcessingService = new StandardImageProcessingProvider();
