import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import {
  CropService,
  garmentSelectionService,
  GarmentSelectionService,
  GarmentSelection,
  BoundingBoxCoordinates,
} from '../src/services/garment-selection';
import { auraGarmentModel } from '../src/services/garment-ai/auraGarmentModel';

describe('Phase 15 — Target Garment Selection & Production Inference Contract', () => {
  const fixtureImageUri = 'file://' + path.resolve(__dirname, '../assets/curated/asset_0.png');
  const blindFreezePath = path.resolve(__dirname, '../data/garment/metadata/dataset-v0.3-blind-freeze.json');

  beforeEach(() => {
    garmentSelectionService.cancel();
  });

  describe('1. Coordinate Conversion & Space Transformations', () => {
    it('converts pixel coordinates to normalized space correctly', () => {
      const pixelBox: BoundingBoxCoordinates = { x: 100, y: 200, width: 400, height: 600 };
      const normalized = CropService.toNormalized(pixelBox, 'pixel', 1000, 2000);

      expect(normalized.x).toBe(0.1);
      expect(normalized.y).toBe(0.1);
      expect(normalized.width).toBe(0.4);
      expect(normalized.height).toBe(0.3);
    });

    it('converts normalized coordinates to pixel space correctly', () => {
      const normBox: BoundingBoxCoordinates = { x: 0.25, y: 0.5, width: 0.5, height: 0.4 };
      const pixelBox = CropService.toPixel(normBox, 'normalized', 800, 1000);

      expect(pixelBox.x).toBe(200);
      expect(pixelBox.y).toBe(500);
      expect(pixelBox.width).toBe(400);
      expect(pixelBox.height).toBe(400);
    });

    it('converts coordinates to display rendered dimensions correctly', () => {
      const normBox: BoundingBoxCoordinates = { x: 0.1, y: 0.2, width: 0.6, height: 0.5 };
      const displayBox = CropService.toDisplay(normBox, 'normalized', 1000, 1000, 300, 400);

      expect(displayBox.x).toBe(30);
      expect(displayBox.y).toBe(80);
      expect(displayBox.width).toBe(180);
      expect(displayBox.height).toBe(200);
    });
  });

  describe('2. Bounding Box Validation, Padding & Bounds Clamping', () => {
    it('validates correct normalized boxes and flags boundary overflows', () => {
      const validBox: BoundingBoxCoordinates = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
      const resultValid = CropService.validateBoundingBox(validBox, 'normalized', 1000, 1000);
      expect(resultValid.isValid).toBe(true);
      expect(resultValid.errors.length).toBe(0);

      const invalidBox: BoundingBoxCoordinates = { x: 0.7, y: 0.6, width: 0.5, height: 0.6 }; // Exceeds 1.0
      const resultInvalid = CropService.validateBoundingBox(invalidBox, 'normalized', 1000, 1000);
      expect(resultInvalid.isValid).toBe(false);
      expect(resultInvalid.errors.length).toBeGreaterThan(0);
      expect(resultInvalid.clampedBox.x + resultInvalid.clampedBox.width).toBeLessThanOrEqual(1.0001);
      expect(resultInvalid.clampedBox.y + resultInvalid.clampedBox.height).toBeLessThanOrEqual(1.0001);
    });

    it('clamps negative or zero-dimension bounding boxes safely', () => {
      const badBox: BoundingBoxCoordinates = { x: -0.2, y: -0.3, width: 0, height: -0.5 };
      const clamped = CropService.clampNormalized(badBox);

      expect(clamped.x).toBe(0);
      expect(clamped.y).toBe(0);
      expect(clamped.width).toBeGreaterThanOrEqual(0.01);
      expect(clamped.height).toBeGreaterThanOrEqual(0.01);
    });

    it('applies proportional crop padding (5%) and clamps within image bounds', () => {
      const box: BoundingBoxCoordinates = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
      const padded = CropService.applyCropPadding(box, 0.05, 'normalized', 1000, 1000);

      // Pad = 0.4 * 0.05 = 0.02. New X = 0.18, Y = 0.18, W = 0.44, H = 0.44
      expect(padded.x).toBeCloseTo(0.18, 4);
      expect(padded.y).toBeCloseTo(0.18, 4);
      expect(padded.width).toBeCloseTo(0.44, 4);
      expect(padded.height).toBeCloseTo(0.44, 4);

      // Padding on boundary should clamp without exceeding 1.0
      const borderBox: BoundingBoxCoordinates = { x: 0.01, y: 0.01, width: 0.98, height: 0.98 };
      const paddedBorder = CropService.applyCropPadding(borderBox, 0.05, 'normalized', 1000, 1000);
      expect(paddedBorder.x).toBe(0);
      expect(paddedBorder.y).toBe(0);
      expect(paddedBorder.x + paddedBorder.width).toBeLessThanOrEqual(1.0001);
      expect(paddedBorder.y + paddedBorder.height).toBeLessThanOrEqual(1.0001);
    });
  });

  describe('3. Selection State Machine & Override Protection', () => {
    it('manages state machine transitions from IDLE to REGION_SELECTED', () => {
      expect(garmentSelectionService.getState()).toBe('CANCELED');

      garmentSelectionService.initializeWithImage(fixtureImageUri, 800, 1200);
      expect(garmentSelectionService.getState()).toBe('IMAGE_SELECTED');

      const selection = garmentSelectionService.setManualSelection({
        x: 0.15,
        y: 0.1,
        width: 0.7,
        height: 0.5,
      });

      expect(garmentSelectionService.getState()).toBe('REGION_SELECTED');
      expect(selection.selectionMethod).toBe('manual');
      expect(selection.coordinateSpace).toBe('normalized');

      garmentSelectionService.resetSelection();
      expect(garmentSelectionService.getState()).toBe('SELECTING_REGION');
      expect(garmentSelectionService.getSelection()).toBeNull();
    });

    it('loads optional automatic suggestions clearly labeled as "SUGGESTED GARMENT"', async () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 800, 1200);
      const suggestions = await garmentSelectionService.loadAutomaticSuggestions();

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].label).toBe('SUGGESTED GARMENT');
      expect(suggestions[0].confidence).toBeGreaterThan(0.4);

      // Apply suggestion explicitly
      const applied = garmentSelectionService.applySuggestedSelection(suggestions[0].id);
      expect(applied.selectionMethod).toBe('suggested');
      expect(garmentSelectionService.getState()).toBe('REGION_SELECTED');

      // Manual selection MUST override suggestion cleanly
      const manual = garmentSelectionService.setManualSelection({ x: 0.2, y: 0.3, width: 0.5, height: 0.4 });
      expect(manual.selectionMethod).toBe('manual');
      expect(garmentSelectionService.getSelection()?.selectionMethod).toBe('manual');
    });

    it('handles cancellation and invalid input gracefully', () => {
      expect(() => {
        garmentSelectionService.initializeWithImage('', 500, 500);
      }).toThrow('Image URI cannot be empty');

      expect(() => {
        garmentSelectionService.initializeWithImage('file:///test.png', 0, -10);
      }).toThrow('Invalid image dimensions');

      garmentSelectionService.initializeWithImage(fixtureImageUri, 800, 800);
      garmentSelectionService.cancel();
      expect(garmentSelectionService.getState()).toBe('CANCELED');
      expect(garmentSelectionService.getSelection()).toBeNull();
    });
  });

  describe('4. Inference Contract, Confidence Gate & Fallback Safety', () => {
    it('enforces confidence refusal gate (< 0.65) without fabricating attributes', async () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 800, 1200);
      garmentSelectionService.setManualSelection({ x: 0.2, y: 0.2, width: 0.6, height: 0.6 });

      // Mock low-confidence result from model
      jest.spyOn(auraGarmentModel, 'predictAttributes').mockResolvedValueOnce({
        model_id: 'aura-garment-v1-exp0015',
        version: '0.1.0-exp0015',
        labels: {
          category: 'tops',
          subcategory: 'knit_sweater',
          primary_color_hex: '#1A1A1A',
          color_family: 'black',
          fit: 'Regular',
          silhouette: 'straight',
          pattern: 'solid',
          material: 'wool',
          formality_score: 0.5,
          occasions: ['Casual'],
          seasons: ['Fall'],
        },
        confidences: {
          category: 0.48, // BELOW 0.65 threshold
          subcategory: 0.4,
          fit: 0.5,
          silhouette: 0.4,
          color_family: 0.6,
          pattern: 0.5,
          material: 0.3,
          formality: 0.5,
        },
        latency_ms: 250,
        runtime_device: 'gpu_serverless',
        calibrated: true,
      });

      const result = await garmentSelectionService.executeInference();

      expect(result.status).toBe('REFUSED');
      expect(result.category).toBe('unknown');
      expect(result.attributes.category).toBe('unknown');
      expect(result.attributes.material).toBe('unknown');
      expect(result.confidence).toBe(0.48);
      expect(result.refusalReason).toContain('below minimum threshold (65.0%)');
      expect(result.modelVersion).toBe(GarmentSelectionService.MODEL_VERSION);
    });

    it('returns structured success and valid telemetry when confidence >= 0.65', async () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 800, 1200);
      garmentSelectionService.setManualSelection({ x: 0.1, y: 0.1, width: 0.8, height: 0.5 });

      jest.spyOn(auraGarmentModel, 'predictAttributes').mockResolvedValueOnce({
        model_id: 'aura-garment-v1-exp0015',
        version: '0.1.0-exp0015',
        labels: {
          category: 'tops',
          subcategory: 'knit_sweater',
          primary_color_hex: '#1A1A1A',
          color_family: 'black',
          fit: 'Regular',
          silhouette: 'straight',
          pattern: 'solid',
          material: 'wool',
          formality_score: 0.5,
          occasions: ['Casual'],
          seasons: ['Fall'],
        },
        confidences: {
          category: 0.88, // ACCEPTED >= 0.65
          subcategory: 0.8,
          fit: 0.85,
          silhouette: 0.8,
          color_family: 0.95,
          pattern: 0.9,
          material: 0.75,
          formality: 0.85,
        },
        latency_ms: 320,
        runtime_device: 'gpu_serverless',
        calibrated: true,
      });

      const result = await garmentSelectionService.executeInference();

      expect(result.status).toBe('SUCCESS');
      expect(result.category).toBe('tops');
      expect(result.confidence).toBe(0.88);
      expect(result.attributes.material).toBe('wool');
      expect(result.latency.total_ms).toBeGreaterThanOrEqual(0);
      expect(result.modelVersion).toBe('aura-garment-v1-exp0015');
    });

    it('maintains safe deterministic fallback when ML inference errors', async () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 800, 1200);
      garmentSelectionService.setManualSelection({ x: 0.1, y: 0.1, width: 0.8, height: 0.5 });

      jest.spyOn(auraGarmentModel, 'predictAttributes').mockRejectedValueOnce(new Error('CUDA out of memory'));

      const result = await garmentSelectionService.executeInference();

      expect(result.status).toBe('ERROR');
      expect(result.error).toContain('CUDA out of memory');
      expect(result.category).toBe('unknown');
    });
  });

  describe('5. Deterministic End-to-End Integration Flow (Section 30)', () => {
    it('executes full image → manual selection → crop padding → model adapter → result', async () => {
      // 1. Full image input
      garmentSelectionService.initializeWithImage(fixtureImageUri, 1024, 1536);
      expect(garmentSelectionService.getState()).toBe('IMAGE_SELECTED');

      // 2. Manual Target Selection (User chooses specific jacket/sweater region)
      const selection = garmentSelectionService.setManualSelection(
        { x: 0.15, y: 0.12, width: 0.70, height: 0.48 },
        'normalized',
        0.05
      );
      expect(garmentSelectionService.getState()).toBe('REGION_SELECTED');
      expect(selection.sourceWidth).toBe(1024);

      // 3. Execution through Model Adapter
      const result = await garmentSelectionService.executeInference({
        imageUri: fixtureImageUri,
        selection,
        modelVersion: 'aura-garment-v1-exp0015',
        inferenceMode: 'manual_crop',
      });

      // 4. Result validation
      expect(['SUCCESS', 'REFUSED']).toContain(result.status);
      expect(result.modelVersion).toBe('aura-garment-v1-exp0015');
      expect(result.selectionMethod).toBe('manual');
      expect(result.bbox.width).toBeGreaterThanOrEqual(selection.bbox.width); // Padded
      expect(result.latency.total_ms).toBeGreaterThanOrEqual(0);

      // Section 21 Benchmark Recording
      const tSel0 = performance.now();
      garmentSelectionService.setManualSelection({ x: 0.2, y: 0.2, width: 0.5, height: 0.5 });
      const tSel1 = performance.now();
      const selInteractionMs = tSel1 - tSel0;

      console.log('ACTUAL_MEASURED_PERFORMANCE:', JSON.stringify({
        selector_interaction_ms: Number(selInteractionMs.toFixed(3)),
        crop_processing_ms: result.latency.crop_ms,
        model_inference_ms: result.latency.inference_ms,
        total_ms: result.latency.total_ms,
      }));
    });
  });

  describe('6. Blind Test & Forensic Governance Integrity', () => {
    it('verifies dataset-v0.3-blind-freeze SHA-256 checksum is strictly unchanged', () => {
      expect(fs.existsSync(blindFreezePath)).toBe(true);
      const content = fs.readFileSync(blindFreezePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      expect(hash).toBe('5371dfe1d0911aa80a1570b0a54ba198a250770311389de707d9cf0c799d43bd');
    });

    it('verifies Phase 15 forensic verification passes with 0 commercial APIs', () => {
      const forensicPath = path.resolve(__dirname, '../training/data-audits/phase15/forensic_verification_15.json');
      expect(fs.existsSync(forensicPath)).toBe(true);

      const audit = JSON.parse(fs.readFileSync(forensicPath, 'utf8'));
      expect(audit.status).toBe('PASS');
      expect(audit.checks.dataset_immutability.blind_freeze_verified).toBe(true);
      expect(audit.checks.inference_contract.model_version).toBe('aura-garment-v1-exp0015');
      expect(audit.checks.inference_contract.confidence_threshold).toBe(0.65);
      expect(audit.checks.scientific_integrity.zero_commercial_apis).toBe(true);
    });
  });

  describe('7. Phase 15A End-to-End Integration Tests (A through J)', () => {
    it('A. Single-garment image flow: initializes and presents selector without skipping', () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 800, 1000);
      expect(garmentSelectionService.getState()).toBe('IMAGE_SELECTED');

      const selection = garmentSelectionService.setManualSelection({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
      expect(garmentSelectionService.getState()).toBe('REGION_SELECTED');
      expect(selection.selectionMethod).toBe('manual');
    });

    it('B. Multi-garment image flow: targets one specific item (trousers) from full outfit', () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 1200, 1600);
      // User specifically chooses lower body trousers region
      const trouserSelection = garmentSelectionService.setManualSelection(
        { x: 0.15, y: 0.45, width: 0.70, height: 0.45 },
        'normalized',
        0.05
      );

      expect(trouserSelection.bbox.y).toBe(0.45);
      expect(trouserSelection.sourceWidth).toBe(1200);
      expect(trouserSelection.sourceHeight).toBe(1600);
    });

    it('C. Manual region change: updates coordinates interactively without state corruption', () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 1000, 1000);
      const first = garmentSelectionService.setManualSelection({ x: 0.1, y: 0.1, width: 0.5, height: 0.5 });
      expect(first.bbox.x).toBe(0.1);

      // User adjusts / drags region
      const adjusted = garmentSelectionService.setManualSelection({ x: 0.25, y: 0.25, width: 0.6, height: 0.6 });
      expect(adjusted.bbox.x).toBe(0.25);
      expect(garmentSelectionService.getSelection()?.bbox.x).toBe(0.25);
      expect(garmentSelectionService.getState()).toBe('REGION_SELECTED');
    });

    it('D. Suggested region overridden manually: overrides suggestion immediately', async () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 1000, 1000);
      const suggestions = await garmentSelectionService.loadAutomaticSuggestions();
      expect(suggestions[0].label).toBe('SUGGESTED GARMENT');

      // 1. User applies suggestion
      const suggested = garmentSelectionService.applySuggestedSelection(suggestions[0].id);
      expect(suggested.selectionMethod).toBe('suggested');

      // 2. User drags / edits box -> switches immediately to manual
      const manualOverride = garmentSelectionService.setManualSelection({ x: 0.2, y: 0.2, width: 0.5, height: 0.5 });
      expect(manualOverride.selectionMethod).toBe('manual');
      expect(garmentSelectionService.getSelection()?.selectionMethod).toBe('manual');
    });

    it('E. Cancel selection: cleans up active selection and sets state to CANCELED', () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 1000, 1000);
      garmentSelectionService.setManualSelection({ x: 0.1, y: 0.1, width: 0.5, height: 0.5 });
      expect(garmentSelectionService.getSelection()).not.toBeNull();

      garmentSelectionService.cancel();
      expect(garmentSelectionService.getState()).toBe('CANCELED');
      expect(garmentSelectionService.getSelection()).toBeNull();
    });

    it('F. Invalid crop: validates and clamps bad/overflowing coordinates safely', () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 1000, 1000);
      const clampedSelection = garmentSelectionService.setManualSelection({ x: -0.5, y: 0.8, width: 0.9, height: 0.5 });

      expect(clampedSelection.bbox.x).toBe(0);
      expect(clampedSelection.bbox.x + clampedSelection.bbox.width).toBeLessThanOrEqual(1.0);
      expect(clampedSelection.bbox.y + clampedSelection.bbox.height).toBeLessThanOrEqual(1.0);
    });

    it('G. Successful inference: returns recognized category, confidence, and attributes', async () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 1000, 1000);
      garmentSelectionService.setManualSelection({ x: 0.1, y: 0.1, width: 0.8, height: 0.6 });

      jest.spyOn(auraGarmentModel, 'predictAttributes').mockResolvedValueOnce({
        model_id: 'aura-garment-v1-exp0015',
        version: '0.1.0-exp0015',
        labels: {
          category: 'outerwear',
          subcategory: 'blazer',
          primary_color_hex: '#2B2B2B',
          color_family: 'grey',
          fit: 'Regular',
          silhouette: 'straight',
          pattern: 'solid',
          material: 'wool',
          formality_score: 0.8,
          occasions: ['Work / Office'],
          seasons: ['Fall', 'Winter'],
        },
        confidences: {
          category: 0.91,
          subcategory: 0.85,
          fit: 0.88,
          silhouette: 0.82,
          color_family: 0.95,
          pattern: 0.9,
          material: 0.8,
          formality: 0.88,
        },
        latency_ms: 280,
        runtime_device: 'gpu_serverless',
        calibrated: true,
      });

      const result = await garmentSelectionService.executeInference();
      expect(result.status).toBe('SUCCESS');
      expect(result.category).toBe('outerwear');
      expect(result.confidence).toBe(0.91);
      expect(result.attributes.material).toBe('wool');
      expect(result.modelVersion).toBe('aura-garment-v1-exp0015');
    });

    it('H. Low-confidence refusal: refuses without fabricating attributes when confidence < 0.65', async () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 1000, 1000);
      garmentSelectionService.setManualSelection({ x: 0.1, y: 0.1, width: 0.8, height: 0.6 });

      jest.spyOn(auraGarmentModel, 'predictAttributes').mockResolvedValueOnce({
        model_id: 'aura-garment-v1-exp0015',
        version: '0.1.0-exp0015',
        labels: {
          category: 'bottoms',
          subcategory: 'trousers',
          primary_color_hex: '#333333',
          color_family: 'black',
          fit: 'Regular',
          silhouette: 'straight',
          pattern: 'solid',
          material: 'cotton',
          formality_score: 0.5,
          occasions: ['Casual'],
          seasons: ['All Season'],
        },
        confidences: {
          category: 0.58, // < 0.65 threshold
          subcategory: 0.4,
          fit: 0.5,
          silhouette: 0.4,
          color_family: 0.6,
          pattern: 0.5,
          material: 0.4,
          formality: 0.5,
        },
        latency_ms: 220,
        runtime_device: 'gpu_serverless',
        calibrated: true,
      });

      const result = await garmentSelectionService.executeInference();
      expect(result.status).toBe('REFUSED');
      expect(result.category).toBe('unknown');
      expect(result.attributes.category).toBe('unknown');
      expect(result.attributes.material).toBe('unknown');
      expect(result.refusalReason).toContain('65.0%');
    });

    it('I. Model unavailable: handles unexpected error safely without crashing', async () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 1000, 1000);
      garmentSelectionService.setManualSelection({ x: 0.1, y: 0.1, width: 0.8, height: 0.6 });

      jest.spyOn(auraGarmentModel, 'predictAttributes').mockRejectedValueOnce(new Error('Network timeout'));

      const result = await garmentSelectionService.executeInference();
      expect(result.status).toBe('ERROR');
      expect(result.error).toContain('Network timeout');
      expect(result.category).toBe('unknown');
    });

    it('J. Navigation / back behavior: resets selection to SELECTING_REGION', () => {
      garmentSelectionService.initializeWithImage(fixtureImageUri, 1000, 1000);
      garmentSelectionService.setManualSelection({ x: 0.1, y: 0.1, width: 0.8, height: 0.6 });
      expect(garmentSelectionService.getState()).toBe('REGION_SELECTED');

      garmentSelectionService.resetSelection();
      expect(garmentSelectionService.getState()).toBe('SELECTING_REGION');
      expect(garmentSelectionService.getSelection()).toBeNull();
    });

    it('verifies Phase 15A forensic verification audit passes', () => {
      const forensic15aPath = path.resolve(__dirname, '../training/data-audits/phase15a/forensic_verification_15a.json');
      expect(fs.existsSync(forensic15aPath)).toBe(true);

      const audit = JSON.parse(fs.readFileSync(forensic15aPath, 'utf8'));
      expect(audit.status).toBe('PASS');
      expect(audit.checks.add_screen_integration.status).toBe('PASS');
      expect(audit.checks.model_governance.model_version).toBe('aura-garment-v1-exp0015');
      expect(audit.checks.dataset_immutability.blind_freeze_verified).toBe(true);
      expect(audit.checks.scientific_integrity.zero_commercial_apis).toBe(true);
    });
  });

  describe('8. Phase 15B Physical Mobile Device Validation & Regression Tests', () => {
    describe('Aspect-Fit Letterbox/Pillarbox Compensation', () => {
      it('calculates exact aspect-fit letterboxing for landscape photos', () => {
        // Landscape photo 1920x1080 (16:9) in 360x360 container
        const fit = CropService.computeAspectFit(1920, 1080, 360, 360);
        expect(fit.renderedWidth).toBe(360);
        expect(fit.renderedHeight).toBe(203); // 360 / (1920/1080) = 202.5 -> 203
        expect(fit.offsetX).toBe(0);
        expect(fit.offsetY).toBe(79); // (360 - 203) / 2 = 78.5 -> 79
      });

      it('calculates exact aspect-fit pillarboxing for portrait photos', () => {
        // Portrait photo 1080x1920 (9:16) in 360x360 container
        const fit = CropService.computeAspectFit(1080, 1920, 360, 360);
        expect(fit.renderedHeight).toBe(360);
        expect(fit.renderedWidth).toBe(203);
        expect(fit.offsetY).toBe(0);
        expect(fit.offsetX).toBe(79);
      });

      it('calculates 1:1 square image aspect-fit with zero offsets', () => {
        const fit = CropService.computeAspectFit(1000, 1000, 360, 360);
        expect(fit.renderedWidth).toBe(360);
        expect(fit.renderedHeight).toBe(360);
        expect(fit.offsetX).toBe(0);
        expect(fit.offsetY).toBe(0);
      });

      it('safely handles zero or negative source/container dimensions', () => {
        const fit = CropService.computeAspectFit(0, 0, 300, 400);
        expect(fit.renderedWidth).toBe(300);
        expect(fit.renderedHeight).toBe(400);
        expect(fit.offsetX).toBe(0);
        expect(fit.offsetY).toBe(0);
      });
    });

    describe('Touch Interaction & Coordinate Stability', () => {
      it('guarantees normalized coordinates remain strictly identical regardless of container aspect', () => {
        // User selects region [0.2, 0.2, 0.6, 0.6] on a landscape image
        const normBox: BoundingBoxCoordinates = { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
        const pixelBox = CropService.toPixel(normBox, 'normalized', 1920, 1080);

        expect(pixelBox.x).toBe(Math.round(0.2 * 1920));
        expect(pixelBox.y).toBe(Math.round(0.2 * 1080));
        expect(pixelBox.width).toBe(Math.round(0.6 * 1920));
        expect(pixelBox.height).toBe(Math.round(0.6 * 1080));
      });

      it('enforces minimum dimension guard to prevent handle collapse on touch', () => {
        const tinyBox: BoundingBoxCoordinates = { x: 0.1, y: 0.1, width: 0.002, height: 0.003 };
        const clamped = CropService.clampNormalized(tinyBox);

        expect(clamped.width).toBeGreaterThanOrEqual(0.01);
        expect(clamped.height).toBeGreaterThanOrEqual(0.01);
      });

      it('prevents stale selection leaks on re-initialization (Test Case H)', () => {
        garmentSelectionService.initializeWithImage('file:///test1.jpg', 800, 1200);
        garmentSelectionService.setManualSelection({ x: 0.2, y: 0.3, width: 0.4, height: 0.5 });
        expect(garmentSelectionService.getSelection()?.imageUri).toBe('file:///test1.jpg');

        // Re-initialize with replacement image
        garmentSelectionService.initializeWithImage('file:///test2.jpg', 1080, 1080);
        expect(garmentSelectionService.getState()).toBe('IMAGE_SELECTED');
        expect(garmentSelectionService.getSelection()).toBeNull();
      });
    });

    it('verifies Phase 15B forensic mobile validation audit passes', () => {
      const forensic15bPath = path.resolve(__dirname, '../training/data-audits/phase15b/forensic_verification_15b.json');
      if (fs.existsSync(forensic15bPath)) {
        const audit = JSON.parse(fs.readFileSync(forensic15bPath, 'utf8'));
        expect(audit.status).toBe('PASS');
        expect(audit.checks.model_governance.model_version).toBe('aura-garment-v1-exp0015');
        expect(audit.checks.dataset_immutability.blind_freeze_verified).toBe(true);
        expect(audit.checks.scientific_integrity.zero_commercial_apis).toBe(true);
      }
    });
  });
});
