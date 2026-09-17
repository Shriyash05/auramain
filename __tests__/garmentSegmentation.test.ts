import { GarmentSegmentationService } from '../src/services/image-processing/garmentSegmentationService';
import { GarmentPresentationService } from '../src/services/image-processing/garmentPresentationService';
import { Garment } from '../src/types/garment';

describe('Garment Segmentation & Presentation Service', () => {
  it('identifies and preserves clean transparent cutout assets', async () => {
    const res = await GarmentSegmentationService.segmentGarment('file:///path/to/shirt_cutout.png', {
      forceTransparency: true,
    });

    expect(res.success).toBe(true);
    expect(res.isTransparent).toBe(true);
    expect(res.method).toBe('neural_matting');
    expect(res.requiresManualFallback).toBe(false);
    expect(res.qualityGate.passed).toBe(true);
  });

  it('generates alpha mask for catalogue products removing surrounding background', async () => {
    const res = await GarmentSegmentationService.segmentGarment('https://assets.myntassets.com/clean_catalog.jpg', {
      sourceType: 'product_catalog',
    });

    expect(res.success).toBe(true);
    expect(res.isTransparent).toBe(true);
    expect(res.method).toBe('catalog_alpha_mask');
    expect(res.requiresManualFallback).toBe(false);
    expect(res.qualityGate.passed).toBe(true);
    expect(res.qualityGate.hasTransparentSurroundings).toBe(true);
  });

  it('evaluates quality gate and rejects assets with no transparent background', () => {
    const gate = GarmentSegmentationService.evaluateQualityGate(false, 1.0, false);
    expect(gate.passed).toBe(false);
    expect(gate.rejectionReason).toContain('Background not removed');
  });

  it('evaluates quality gate and rejects severely clipped or empty cutouts', () => {
    const gate = GarmentSegmentationService.evaluateQualityGate(true, 0.02, true);
    expect(gate.passed).toBe(false);
    expect(gate.rejectionReason).toContain('severely clipped');
  });

  it('triggers manual selection fallback when automatic isolation cannot resolve lifestyle photo', async () => {
    const res = await GarmentSegmentationService.segmentGarment('file:///bedroom_mirror_lifestyle.jpg', {
      sourceType: 'lifestyle',
    });

    expect(res.success).toBe(false);
    expect(res.requiresManualFallback).toBe(true);
    expect(res.message).toBe("Couldn't isolate the garment automatically. Select the garment manually.");
    expect(GarmentSegmentationService.shouldOfferManualRefinement(res)).toBe(true);
  });

  it('supports manual bounding box fallback from precision region selector', async () => {
    const res = await GarmentSegmentationService.segmentGarment('file:///lifestyle_photo.jpg', {
      manualBbox: { x: 0.1, y: 0.2, width: 0.8, height: 0.6 },
    });

    expect(res.success).toBe(true);
    expect(res.isTransparent).toBe(true);
    expect(res.method).toBe('manual_selection_fallback');
    expect(res.requiresManualFallback).toBe(false);
    expect(res.qualityGate.passed).toBe(true);
  });

  it('presents transparent cutout garments with clean background metadata', () => {
    const garment: Garment = {
      id: 'g_123',
      user_id: 'u_1',
      name: 'Yellow T-Shirt',
      category: 'tops',
      original_image: 'https://assets.myntassets.com/raw.jpg',
      processed_image: 'file:///cutout_yellow_tee.png',
      primary_color: 'Yellow',
      favorite: false,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const asset = GarmentPresentationService.resolvePresentationAsset(garment);
    expect(asset.isIsolated).toBe(true);
    expect(asset.metadata.hasCleanBackground).toBe(true);
  });
});

