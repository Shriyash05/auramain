import { GarmentTaxonomyLabels, GarmentModelPrediction } from '../../types/garmentTaxonomy';

export type GarmentModelResult = GarmentModelPrediction;

export interface IGarmentUnderstandingModel {
  readonly modelId: string;
  readonly version: string;
  readonly isLoaded: boolean;

  /**
   * Extracts structured garment taxonomy attributes from an image URI or URL.
   * Returns calibrated confidences and structured labels.
   */
  predictAttributes(imageUri: string): Promise<GarmentModelResult>;
}
