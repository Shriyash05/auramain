import { GarmentModelResult } from '../../../src/services/garment-ai/types';
import { GarmentTaxonomyLabels } from '../../../src/types/garmentTaxonomy';

export type ReviewClassification = 'CORRECT' | 'INCORRECT' | 'AMBIGUOUS' | 'UNKNOWN';

export interface ReviewItem {
  review_id: string;
  image_id: string;
  image_path: string;
  ground_truth: GarmentTaxonomyLabels;
  model_prediction: GarmentModelResult;
  classification: ReviewClassification;
  reviewer_notes?: string;
  reviewed_at: string;
}

export class GarmentReviewTool {
  private static reviewQueue: ReviewItem[] = [];

  public static enqueueForReview(
    imageId: string,
    imagePath: string,
    groundTruth: GarmentTaxonomyLabels,
    prediction: GarmentModelResult,
    initialClassification: ReviewClassification = 'AMBIGUOUS',
    notes?: string
  ): ReviewItem {
    const item: ReviewItem = {
      review_id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      image_id: imageId,
      image_path: imagePath,
      ground_truth: groundTruth,
      model_prediction: prediction,
      classification: initialClassification,
      reviewer_notes: notes,
      reviewed_at: new Date().toISOString(),
    };
    this.reviewQueue.push(item);
    return item;
  }

  public static getPendingReviews(): ReviewItem[] {
    return [...this.reviewQueue];
  }

  public static submitReviewDecision(reviewId: string, decision: ReviewClassification, notes?: string): boolean {
    const item = this.reviewQueue.find((r) => r.review_id === reviewId);
    if (!item) return false;
    item.classification = decision;
    if (notes) item.reviewer_notes = notes;
    item.reviewed_at = new Date().toISOString();
    return true;
  }
}
