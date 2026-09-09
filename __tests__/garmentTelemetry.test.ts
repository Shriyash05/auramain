import {
  GarmentTelemetryService,
  MockTelemetryProvider,
  getConfidenceBucket,
  getLatencyBucket,
  getImageOrientation,
  getCropAspectBucket,
  sanitizeTelemetryMetadata,
} from '../src/services/telemetry';

describe('Phase 15C — Production Rollout Telemetry & Confidence Gate Audit', () => {
  let mockProvider: MockTelemetryProvider;
  let telemetryService: GarmentTelemetryService;

  beforeEach(() => {
    mockProvider = new MockTelemetryProvider();
    telemetryService = new GarmentTelemetryService(mockProvider);
  });

  describe('1. Coarse Bucketing & Orientation Functions', () => {
    it('maps confidence values to coarse privacy-preserving buckets', () => {
      expect(getConfidenceBucket(0.15)).toBe('<0.25');
      expect(getConfidenceBucket(0.35)).toBe('0.25-0.49');
      expect(getConfidenceBucket(0.55)).toBe('0.50-0.64');
      expect(getConfidenceBucket(0.72)).toBe('0.65-0.79');
      expect(getConfidenceBucket(0.85)).toBe('0.80-0.89');
      expect(getConfidenceBucket(0.95)).toBe('>=0.90');
    });

    it('maps latency values to coarse buckets', () => {
      expect(getLatencyBucket(120)).toBe('<250ms');
      expect(getLatencyBucket(350)).toBe('250-500ms');
      expect(getLatencyBucket(820)).toBe('500-1000ms');
      expect(getLatencyBucket(1450)).toBe('1-2s');
      expect(getLatencyBucket(2800)).toBe('>2s');
    });

    it('determines image orientation correctly', () => {
      expect(getImageOrientation(1920, 1080)).toBe('landscape');
      expect(getImageOrientation(1080, 1920)).toBe('portrait');
      expect(getImageOrientation(1000, 1000)).toBe('square');
      expect(getImageOrientation(0, 0)).toBe('square');
    });

    it('determines crop aspect ratio bucket correctly', () => {
      expect(getCropAspectBucket(800, 400)).toBe('wide');
      expect(getCropAspectBucket(400, 800)).toBe('tall');
      expect(getCropAspectBucket(500, 500)).toBe('square');
    });
  });

  describe('2. Privacy Enforcement & Image Data Rejection', () => {
    it('CRITICAL PRIVACY TEST: rejects events containing imageUri or file paths', () => {
      expect(() => {
        sanitizeTelemetryMetadata({
          imageUri: 'file:///data/user/0/com.aura/cache/photo.jpg',
        });
      }).toThrow(/banned key 'imageUri'/i);

      expect(() => {
        sanitizeTelemetryMetadata({
          uri: 'https://images.unsplash.com/photo-123',
        });
      }).toThrow(/banned key 'uri'/i);

      expect(() => {
        sanitizeTelemetryMetadata({
          filePath: '/Users/test/photo.png',
        });
      }).toThrow(/banned key 'filePath'/i);

      expect(() => {
        sanitizeTelemetryMetadata({
          base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        });
      }).toThrow(/banned key 'base64'/i);

      expect(() => {
        sanitizeTelemetryMetadata({
          rawCrop: [0, 1, 2, 3],
        });
      }).toThrow(/banned key 'rawCrop'/i);

      expect(() => {
        sanitizeTelemetryMetadata({
          cropBitmap: 'buffer',
        });
      }).toThrow(/banned key 'cropBitmap'/i);
    });

    it('CRITICAL PRIVACY TEST: rejects string values containing local filesystem or URI schemes', () => {
      expect(() => {
        sanitizeTelemetryMetadata({
          arbitraryKey: 'file:///storage/emulated/0/DCIM/camera.jpg',
        });
      }).toThrow(/prohibited uri or path value/i);

      expect(() => {
        sanitizeTelemetryMetadata({
          arbitraryKey: 'data:image/png;base64,iVBORw0KGgo...',
        });
      }).toThrow(/prohibited uri or path value/i);
    });

    it('asserts that NO emitted telemetry event ever contains raw image data or URIs', async () => {
      await telemetryService.trackImageSelected(1080, 1920);
      await telemetryService.trackSelectionStarted(1080, 1920);
      await telemetryService.trackSelectionConfirmed('manual', 400, 600);
      await telemetryService.trackCropCreated(400, 600);
      await telemetryService.trackInferenceStarted('manual_crop', 'manual');
      await telemetryService.trackInferenceSuccess({
        confidence: 0.88,
        latencyMs: 320,
        cropWidth: 400,
        cropHeight: 600,
        selectionMethod: 'manual',
        category: 'tops',
      });
      await telemetryService.trackSaveSuccess(true);

      const events = await mockProvider.getEvents();
      expect(events.length).toBe(7);

      for (const event of events) {
        const json = JSON.stringify(event).toLowerCase();
        expect(json).not.toContain('imageuri');
        expect(json).not.toContain('fileuri');
        expect(json).not.toContain('base64');
        expect(json).not.toContain('rawcrop');
        expect(json).not.toContain('file:///');
        expect(json).not.toContain('data:image');
      }
    });
  });

  describe('3. Event Creation & Model Version Tagging', () => {
    it('tags every event with explicit model version aura-garment-v1-exp0015', async () => {
      await telemetryService.trackImageSelected(1000, 1000);
      const events = await mockProvider.getEvents();

      expect(events.length).toBe(1);
      expect(events[0].metadata.model_version).toBe('aura-garment-v1-exp0015');
      expect(events[0].session_id).toMatch(/^sess_/);
      expect(events[0].event_id).toMatch(/^evt_/);
    });

    it('records error events with typed safe error codes', async () => {
      await telemetryService.trackInferenceError('MODEL_UNAVAILABLE', 150);
      const events = await mockProvider.getEvents();

      expect(events[0].event_type).toBe('GARMENT_INFERENCE_ERROR');
      expect(events[0].metadata.error_code).toBe('MODEL_UNAVAILABLE');
      expect(events[0].metadata.production_accepted).toBe(false);
      expect(events[0].metadata.result_status).toBe('ERROR');
    });
  });

  describe('4. Confidence Gate & Refusal Funnel Separation', () => {
    it('marks inference success with production_accepted=true when confidence >= 0.65', async () => {
      await telemetryService.trackInferenceSuccess({
        confidence: 0.82,
        latencyMs: 400,
        cropWidth: 500,
        cropHeight: 500,
        selectionMethod: 'manual',
        category: 'outerwear',
      });

      const events = await mockProvider.getEvents();
      expect(events[0].metadata.result_status).toBe('SUCCESS');
      expect(events[0].metadata.production_accepted).toBe(true);
      expect(events[0].metadata.confidence_bucket).toBe('0.80-0.89');
    });

    it('marks low-confidence result with production_accepted=false when confidence < 0.65', async () => {
      await telemetryService.trackInferenceRefused({
        confidence: 0.58,
        latencyMs: 380,
        cropWidth: 500,
        cropHeight: 500,
        selectionMethod: 'manual',
      });

      const events = await mockProvider.getEvents();
      expect(events[0].metadata.result_status).toBe('REFUSED');
      expect(events[0].metadata.production_accepted).toBe(false);
      expect(events[0].metadata.confidence_bucket).toBe('0.50-0.64');
    });
  });

  describe('5. Funnel and Retry Calculations', () => {
    it('computes accurate end-to-end conversion funnel summary', async () => {
      // Simulate 2 user flows: 1 accepted and saved, 1 refused
      // Flow 1
      await telemetryService.trackImageSelected(1000, 1500);
      await telemetryService.trackSelectionStarted(1000, 1500);
      await telemetryService.trackSelectionConfirmed('manual', 600, 800);
      await telemetryService.trackCropCreated(600, 800);
      await telemetryService.trackInferenceStarted('manual_crop', 'manual');
      await telemetryService.trackInferenceSuccess({
        confidence: 0.92,
        latencyMs: 300,
        cropWidth: 600,
        cropHeight: 800,
        selectionMethod: 'manual',
        category: 'tops',
      });
      await telemetryService.trackSaveSuccess(true);

      // Flow 2
      await telemetryService.trackImageSelected(1200, 1200);
      await telemetryService.trackSelectionStarted(1200, 1200);
      await telemetryService.trackSelectionConfirmed('suggested', 500, 500);
      await telemetryService.trackCropCreated(500, 500);
      await telemetryService.trackInferenceStarted('suggested_crop', 'suggested');
      await telemetryService.trackInferenceRefused({
        confidence: 0.45,
        latencyMs: 250,
        cropWidth: 500,
        cropHeight: 500,
        selectionMethod: 'suggested',
      });

      const funnel = await telemetryService.computeFunnelSummary();

      expect(funnel.images_selected).toBe(2);
      expect(funnel.selection_confirmed).toBe(2);
      expect(funnel.inference_started).toBe(2);
      expect(funnel.inference_completed).toBe(2);
      expect(funnel.accepted).toBe(1);
      expect(funnel.refused).toBe(1);
      expect(funnel.saved).toBe(1);
      expect(funnel.rates.acceptance_pct).toBe(50.0);
      expect(funnel.rates.refusal_pct).toBe(50.0);
      expect(funnel.rates.save_conversion_pct).toBe(50.0);
    });

    it('computes retry and cancellation metrics', async () => {
      await telemetryService.trackSelectionCanceled('user_retake');
      await telemetryService.trackSelectionReset();
      await telemetryService.trackInferenceRefused({
        confidence: 0.50,
        latencyMs: 300,
        cropWidth: 400,
        cropHeight: 400,
        selectionMethod: 'manual',
      });
      await telemetryService.trackInferenceStarted('manual_crop', 'manual');

      const retrySummary = await telemetryService.computeRetrySummary();

      expect(retrySummary.selection_cancel_count).toBe(1);
      expect(retrySummary.selection_reset_count).toBe(1);
      expect(retrySummary.refusal_retry_count).toBe(1);
    });

    it('tracks user prediction feedback safely (Section 22)', async () => {
      await telemetryService.trackPredictionFeedback('CORRECT', 'tops');
      await telemetryService.trackPredictionFeedback('INCORRECT', 'outerwear');

      const events = await mockProvider.getEvents();
      expect(events.length).toBe(2);
      expect(events[0].metadata.feedback).toBe('CORRECT');
      expect(events[0].metadata.category_predicted).toBe('tops');
      expect(events[1].metadata.feedback).toBe('INCORRECT');
    });
  });
});
