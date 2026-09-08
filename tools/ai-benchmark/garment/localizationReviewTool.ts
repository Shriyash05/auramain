/**
 * AURA Human Localization Review Tool (Phase 13C)
 * 
 * Provides tooling to:
 * - Annotate bounding boxes for multi-garment wardrobe images
 * - Select category and subcategory
 * - Mark occlusion levels (visible, partially_occluded, heavily_occluded)
 * - Assign review validation states (CORRECT, INCORRECT, AMBIGUOUS, UNKNOWN)
 * - Persist and evaluate ground-truth bounding boxes against automated proposals
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  BoundingBox,
  GarmentInstanceAnnotation,
  ImageLocalizationAnnotation,
  OcclusionLevel,
  ReviewState,
} from '../../../src/services/garment-localization/types';
import { HeuristicGarmentLocalizationService } from '../../../src/services/garment-localization/garmentLocalizationService';

export class LocalizationReviewTool {
  private static annotations: Map<string, ImageLocalizationAnnotation> = new Map();

  /**
   * Initializes or loads annotations from a JSON ground-truth registry.
   */
  public static loadRegistry(filePath: string): void {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const items: ImageLocalizationAnnotation[] = data.annotations || data;
      this.annotations.clear();
      for (const item of items) {
        this.annotations.set(item.image_id, item);
      }
    }
  }

  /**
   * Adds or updates an image annotation.
   */
  public static annotateImage(
    imageId: string,
    imagePath: string,
    width: number,
    height: number,
    instances: GarmentInstanceAnnotation[],
    notes?: string
  ): ImageLocalizationAnnotation {
    const record: ImageLocalizationAnnotation = {
      image_id: imageId,
      image_path: imagePath,
      image_width: width,
      image_height: height,
      garment_instances: instances.map((inst) => ({
        ...inst,
        bbox: {
          x: Math.max(0, Math.min(1, inst.bbox.x)),
          y: Math.max(0, Math.min(1, inst.bbox.y)),
          width: Math.max(0.01, Math.min(1 - inst.bbox.x, inst.bbox.width)),
          height: Math.max(0.01, Math.min(1 - inst.bbox.y, inst.bbox.height)),
          pixel_bbox: inst.bbox.pixel_bbox || [
            Math.round(inst.bbox.x * width),
            Math.round(inst.bbox.y * height),
            Math.round(inst.bbox.width * width),
            Math.round(inst.bbox.height * height),
          ],
        },
      })),
      annotator_notes: notes,
    };

    this.annotations.set(imageId, record);
    return record;
  }

  /**
   * Evaluates candidate proposals against ground-truth bounding boxes.
   */
  public static evaluateProposals(
    imageId: string,
    proposals: Array<{ bbox: BoundingBox; confidence: number }>,
    iouThreshold = 0.5
  ): { maxIoU: number; matched: boolean; precision: number; recall: number } {
    const gt = this.annotations.get(imageId);
    if (!gt || gt.garment_instances.length === 0) {
      return { maxIoU: 0, matched: false, precision: 0, recall: 0 };
    }

    let maxIoU = 0;
    let truePositives = 0;

    for (const prop of proposals) {
      let bestPropIoU = 0;
      for (const inst of gt.garment_instances) {
        const iou = HeuristicGarmentLocalizationService.computeIoU(prop.bbox, inst.bbox);
        if (iou > bestPropIoU) bestPropIoU = iou;
        if (iou > maxIoU) maxIoU = iou;
      }
      if (bestPropIoU >= iouThreshold) {
        truePositives++;
      }
    }

    const precision = proposals.length > 0 ? truePositives / proposals.length : 0;
    const recall = gt.garment_instances.length > 0 ? Math.min(1, truePositives / gt.garment_instances.length) : 0;

    return {
      maxIoU: Number(maxIoU.toFixed(4)),
      matched: maxIoU >= iouThreshold,
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
    };
  }

  /**
   * Persists all annotations to the specified ground-truth JSON path.
   */
  public static persistRegistry(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const list = Array.from(this.annotations.values());
    const payload = {
      benchmark_name: 'AURA-Real-World-Garment-Localization-Ground-Truth',
      version: '1.0.0',
      total_annotated_images: list.length,
      total_annotated_instances: list.reduce((acc, cur) => acc + cur.garment_instances.length, 0),
      annotations: list,
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  }

  public static getAnnotation(imageId: string): ImageLocalizationAnnotation | undefined {
    return this.annotations.get(imageId);
  }

  public static getAllAnnotations(): ImageLocalizationAnnotation[] {
    return Array.from(this.annotations.values());
  }
}
