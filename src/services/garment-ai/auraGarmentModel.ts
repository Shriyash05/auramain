import { IGarmentUnderstandingModel, GarmentModelResult } from './types';
import { imageProcessingService } from '../image-processing/imageProcessingProvider';
import { AuraModelRouter } from '../../../tools/ai-benchmark/modelRouter';
import { AuraCategory, AuraFit, AuraSilhouette, AuraColorFamily, AuraPattern, AuraMaterial } from '../../types/garmentTaxonomy';

export class AuraGarmentModel implements IGarmentUnderstandingModel {
  public readonly modelId = 'aura-garment-v1';
  public readonly version = '0.1.0-alpha';
  public isLoaded = true;

  public async predictAttributes(imageUri: string): Promise<GarmentModelResult> {
    const startTime = Date.now();

    try {
      // 1. Attempt inference through AuraModelRouter
      if (AuraModelRouter.hasCapability('garment-understanding')) {
        const raw = await AuraModelRouter.routeGarmentExtraction(imageUri);
        const elapsed = Date.now() - startTime;

        return {
          model_id: this.modelId,
          version: this.version,
          labels: {
            category: raw.category as AuraCategory,
            subcategory: (raw.subcategory || 'unknown') as any,
            primary_color_hex: raw.primary_color || '#F0EFEA',
            color_family: 'cream',
            fit: (raw.fit || 'unknown') as AuraFit,
            silhouette: 'relaxed',
            pattern: 'solid',
            material: (raw.material || 'cotton') as AuraMaterial,
            formality_score: raw.formality_score || 0.5,
            occasions: raw.occasion as any[] || ['Casual'],
            seasons: raw.season as any[] || ['All Season'],
          },
          confidences: {
            category: raw.confidence || 0.9,
            subcategory: 0.75,
            fit: 0.8,
            silhouette: 0.75,
            color_family: 0.95,
            pattern: 0.85,
            material: 0.7,
            formality: 0.85,
          },
          latency_ms: elapsed,
          runtime_device: 'gpu_serverless',
          calibrated: false,
        };
      }
    } catch (e) {
      console.warn('[AuraGarmentModel] ML router inference failed, using deterministic fallback:', e);
    }

    // 2. Deterministic Image Processing Fallback
    const fallback = await imageProcessingService.processGarmentImage(imageUri);
    const elapsed = Date.now() - startTime;

    return {
      model_id: this.modelId,
      version: this.version,
      labels: {
        category: fallback.category as AuraCategory,
        subcategory: (fallback.subcategory || 'unknown') as any,
        primary_color_hex: fallback.primary_color,
        color_family: 'cream',
        fit: (fallback.fit || 'Regular') as AuraFit,
        silhouette: 'straight',
        pattern: (fallback.pattern || 'solid') as AuraPattern,
        material: (fallback.material || 'cotton') as AuraMaterial,
        formality_score: 0.5,
        occasions: fallback.suggested_occasions as any[] || ['Casual'],
        seasons: fallback.suggested_seasons as any[] || ['All Season'],
      },
      confidences: {
        category: 0.9,
        subcategory: 0.6,
        fit: 0.7,
        silhouette: 0.6,
        color_family: 0.9,
        pattern: 0.75,
        material: 0.6,
        formality: 0.7,
      },
      latency_ms: elapsed,
      runtime_device: 'deterministic_fallback',
      calibrated: false,
    };
  }
}

export const auraGarmentModel = new AuraGarmentModel();
