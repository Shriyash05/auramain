import * as fs from 'fs';
import * as path from 'path';
import { GarmentModelResult } from '../../../src/services/garment-ai/types';
import { GarmentTaxonomyLabels } from '../../../src/types/garmentTaxonomy';
import { ResearchContribution } from '../../../src/types/contributor';

export type ReviewClassification = 'CORRECT' | 'INCORRECT' | 'AMBIGUOUS' | 'UNKNOWN' | 'REJECTED';

export interface ReviewItem {
  review_id: string;
  image_id: string;
  image_path: string;
  ground_truth: GarmentTaxonomyLabels;
  model_prediction?: GarmentModelResult;
  classification: ReviewClassification;
  reviewer_notes?: string;
  reviewed_labels?: GarmentTaxonomyLabels;
  reviewed_at: string;
}

export class GarmentReviewTool {
  private static reviewQueue: ReviewItem[] = [];

  public static enqueueForReview(
    imageId: string,
    imagePath: string,
    groundTruth: GarmentTaxonomyLabels,
    prediction?: GarmentModelResult,
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

  public static submitReviewDecision(
    reviewId: string,
    decision: ReviewClassification,
    correctedLabels?: GarmentTaxonomyLabels,
    notes?: string
  ): boolean {
    const item = this.reviewQueue.find((r) => r.review_id === reviewId);
    if (!item) return false;
    item.classification = decision;
    if (correctedLabels) item.reviewed_labels = correctedLabels;
    if (notes) item.reviewer_notes = notes;
    item.reviewed_at = new Date().toISOString();
    return true;
  }

  public static persistReviewedContributions(
    registryPath: string,
    approvedContributions: ResearchContribution[]
  ): void {
    const dir = path.dirname(registryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const payload = {
      registry_name: 'AURA-Contributor-Lineage-Registry',
      version: '1.1.0',
      updated_at: new Date().toISOString(),
      total_approved_contributions: approvedContributions.length,
      contributions: approvedContributions.map((c) => ({
        contributor_sample_id: c.contributor_sample_id,
        status: c.status,
        difficulty: c.difficulty,
        capture_context: c.capture_context,
        sanitized_image_uri: c.sanitized_image_uri,
        submitted_labels: c.submitted_labels,
        reviewed_labels: c.reviewed_labels || c.submitted_labels,
        license_status: c.license_status,
        submitted_at: c.submitted_at,
        reviewed_at: c.reviewed_at,
      })),
    };

    fs.writeFileSync(registryPath, JSON.stringify(payload, null, 2), 'utf8');
  }
}
