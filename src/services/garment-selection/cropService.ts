/**
 * AURA Crop Service (Phase 15)
 * ============================
 * Safe coordinate transformations, bounding box validation,
 * padding calculation, and safe boundary clamping.
 */

import { BoundingBoxCoordinates, CoordinateSpace, CropValidationResult } from './types';

export class CropService {
  public static readonly DEFAULT_PADDING_PCT = 0.05; // 5% default principled padding margin

  /**
   * Converts any bounding box to normalized [0, 1] coordinate space.
   */
  public static toNormalized(
    box: BoundingBoxCoordinates,
    space: CoordinateSpace,
    sourceWidth: number,
    sourceHeight: number
  ): BoundingBoxCoordinates {
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error(`[CropService] Invalid source dimensions: ${sourceWidth}x${sourceHeight}`);
    }

    if (space === 'normalized') {
      return this.clampNormalized(box);
    }

    return this.clampNormalized({
      x: box.x / sourceWidth,
      y: box.y / sourceHeight,
      width: box.width / sourceWidth,
      height: box.height / sourceHeight,
    });
  }

  /**
   * Converts any bounding box to absolute pixel coordinate space.
   */
  public static toPixel(
    box: BoundingBoxCoordinates,
    space: CoordinateSpace,
    sourceWidth: number,
    sourceHeight: number
  ): BoundingBoxCoordinates {
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error(`[CropService] Invalid source dimensions: ${sourceWidth}x${sourceHeight}`);
    }

    if (space === 'pixel') {
      return this.clampPixel(box, sourceWidth, sourceHeight);
    }

    const norm = space === 'normalized' ? box : this.toNormalized(box, space, sourceWidth, sourceHeight);

    return {
      x: Math.round(norm.x * sourceWidth),
      y: Math.round(norm.y * sourceHeight),
      width: Math.max(1, Math.round(norm.width * sourceWidth)),
      height: Math.max(1, Math.round(norm.height * sourceHeight)),
    };
  }

  /**
   * Converts normalized or pixel box to rendered display coordinates.
   */
  public static toDisplay(
    box: BoundingBoxCoordinates,
    space: CoordinateSpace,
    sourceWidth: number,
    sourceHeight: number,
    displayWidth: number,
    displayHeight: number
  ): BoundingBoxCoordinates {
    const norm = this.toNormalized(box, space, sourceWidth, sourceHeight);
    return {
      x: Math.round(norm.x * displayWidth),
      y: Math.round(norm.y * displayHeight),
      width: Math.max(1, Math.round(norm.width * displayWidth)),
      height: Math.max(1, Math.round(norm.height * displayHeight)),
    };
  }

  /**
   * Validates bounding box against coordinate bounds.
   */
  public static validateBoundingBox(
    box: BoundingBoxCoordinates,
    space: CoordinateSpace,
    sourceWidth: number,
    sourceHeight: number
  ): CropValidationResult {
    const errors: string[] = [];

    if (box.width <= 0) {
      errors.push(`Width must be > 0 (got ${box.width})`);
    }
    if (box.height <= 0) {
      errors.push(`Height must be > 0 (got ${box.height})`);
    }

    if (space === 'normalized') {
      if (box.x < 0 || box.x > 1.0) errors.push(`Normalized X out of bounds: ${box.x}`);
      if (box.y < 0 || box.y > 1.0) errors.push(`Normalized Y out of bounds: ${box.y}`);
      if (box.x + box.width > 1.0001) errors.push(`Normalized X+Width exceeds 1.0: ${(box.x + box.width).toFixed(4)}`);
      if (box.y + box.height > 1.0001) errors.push(`Normalized Y+Height exceeds 1.0: ${(box.y + box.height).toFixed(4)}`);

      const clamped = this.clampNormalized(box);
      return { isValid: errors.length === 0, errors, clampedBox: clamped };
    } else {
      if (box.x < 0 || box.x > sourceWidth) errors.push(`Pixel X out of bounds: ${box.x} (sourceWidth ${sourceWidth})`);
      if (box.y < 0 || box.y > sourceHeight) errors.push(`Pixel Y out of bounds: ${box.y} (sourceHeight ${sourceHeight})`);
      if (box.x + box.width > sourceWidth + 1) errors.push(`Pixel X+Width exceeds sourceWidth: ${box.x + box.width}`);
      if (box.y + box.height > sourceHeight + 1) errors.push(`Pixel Y+Height exceeds sourceHeight: ${box.y + box.height}`);

      const clamped = this.clampPixel(box, sourceWidth, sourceHeight);
      return { isValid: errors.length === 0, errors, clampedBox: clamped };
    }
  }

  /**
   * Applies proportional padding margin (e.g. 0.05 for 5%) and clamps within bounds.
   */
  public static applyCropPadding(
    box: BoundingBoxCoordinates,
    paddingPct: number,
    space: CoordinateSpace,
    sourceWidth: number,
    sourceHeight: number
  ): BoundingBoxCoordinates {
    const safePad = Math.max(0, Math.min(0.25, paddingPct)); // Max 25% padding guard
    const padW = box.width * safePad;
    const padH = box.height * safePad;

    const paddedRaw: BoundingBoxCoordinates = {
      x: box.x - padW,
      y: box.y - padH,
      width: box.width + 2 * padW,
      height: box.height + 2 * padH,
    };

    if (space === 'normalized') {
      return this.clampNormalized(paddedRaw);
    }
    return this.clampPixel(paddedRaw, sourceWidth, sourceHeight);
  }

  /**
   * Clamps normalized bounding box coordinates to [0, 1].
   */
  public static clampNormalized(box: BoundingBoxCoordinates): BoundingBoxCoordinates {
    const x = Math.max(0.0, Math.min(1.0, box.x));
    const y = Math.max(0.0, Math.min(1.0, box.y));
    const width = Math.max(0.01, Math.min(1.0 - x, box.width));
    const height = Math.max(0.01, Math.min(1.0 - y, box.height));

    return {
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      width: Number(width.toFixed(4)),
      height: Number(height.toFixed(4)),
    };
  }

  /**
   * Clamps pixel bounding box coordinates to source dimensions.
   */
  public static clampPixel(
    box: BoundingBoxCoordinates,
    sourceWidth: number,
    sourceHeight: number
  ): BoundingBoxCoordinates {
    const x = Math.max(0, Math.min(sourceWidth - 1, Math.round(box.x)));
    const y = Math.max(0, Math.min(sourceHeight - 1, Math.round(box.y)));
    const width = Math.max(1, Math.min(sourceWidth - x, Math.round(box.width)));
    const height = Math.max(1, Math.min(sourceHeight - y, Math.round(box.height)));

    return { x, y, width, height };
  }
}
