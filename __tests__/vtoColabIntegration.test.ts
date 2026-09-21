import { VTOJobClient, getVtoBaseUrl } from '../src/services/vto/vtoJobClient';
import { vtoProvider, AuraDiffusionVTOProvider } from '../src/services/vto/vtoProvider';
import { supabase } from '../src/services/auth/authService';
import { CloudStorageService, UploadedImageAsset } from '../src/services/storage/cloudStorageService';
import { Garment } from '../src/types/garment';

jest.mock('../src/services/auth/authService', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    storage: {
      from: jest.fn(),
    },
  },
  isSupabaseConfigured: true,
}));

describe('AURA VTO Google Colab Integration Tests', () => {
  const originalColabUrl = process.env.EXPO_PUBLIC_VTO_COLAB_URL;
  const originalApiUrl = process.env.EXPO_PUBLIC_VTO_API_URL;
  const mockUserId = 'user_colab_test_001';

  const mockPersonAsset: UploadedImageAsset = {
    bucket: 'vto_inputs',
    objectKey: `${mockUserId}/person_reference.jpg`,
    mimeType: 'image/jpeg',
  };

  const mockGarmentAsset: UploadedImageAsset = {
    bucket: 'vto_inputs',
    objectKey: `${mockUserId}/garment_isolated.png`,
    mimeType: 'image/png',
  };

  const mockGarment: Garment = {
    id: 'garm_colab_silk_top',
    user_id: mockUserId,
    name: 'Silk Linen Top',
    category: 'tops',
    original_image: 'file:///data/top_raw.jpg',
    processed_image: 'file:///data/top_cutout.png',
    primary_color: '#ECE9E2',
    favorite: false,
    user_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();

    (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: 'mock_supabase_colab_access_jwt',
        },
      },
    });

    (supabase!.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: { path: `${mockUserId}/staged_asset.png` },
        error: null,
      }),
      createSignedUrl: jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://xyz.supabase.co/signed/staged_asset.png' },
        error: null,
      }),
    });
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_VTO_COLAB_URL = originalColabUrl;
    process.env.EXPO_PUBLIC_VTO_API_URL = originalApiUrl;
  });

  describe('1. Colab Base URL Configuration (getVtoBaseUrl)', () => {
    it('prioritizes EXPO_PUBLIC_VTO_COLAB_URL over EXPO_PUBLIC_VTO_API_URL', () => {
      process.env.EXPO_PUBLIC_VTO_COLAB_URL = 'https://colab-ngrok-tunnel.ngrok-free.dev';
      process.env.EXPO_PUBLIC_VTO_API_URL = 'https://default-proxy.supabase.co';

      expect(getVtoBaseUrl()).toBe('https://colab-ngrok-tunnel.ngrok-free.dev');
    });

    it('falls back to EXPO_PUBLIC_VTO_API_URL when Colab URL is empty', () => {
      delete process.env.EXPO_PUBLIC_VTO_COLAB_URL;
      process.env.EXPO_PUBLIC_VTO_API_URL = 'https://default-proxy.supabase.co';

      expect(getVtoBaseUrl()).toBe('https://default-proxy.supabase.co');
    });

    it('trims trailing slashes from the configured URL', () => {
      process.env.EXPO_PUBLIC_VTO_COLAB_URL = 'https://colab-ngrok-tunnel.ngrok-free.dev///';
      expect(getVtoBaseUrl()).toBe('https://colab-ngrok-tunnel.ngrok-free.dev');
    });

    it('returns empty string when neither URL is set', () => {
      delete process.env.EXPO_PUBLIC_VTO_COLAB_URL;
      delete process.env.EXPO_PUBLIC_VTO_API_URL;
      expect(getVtoBaseUrl()).toBe('');
    });
  });

  describe('2. Request Construction & Authentication Headers', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_VTO_COLAB_URL = 'https://aura-colab-vto.ngrok-free.dev';
    });

    it('submits job with Bearer token, correct headers, and exact payload format', async () => {
      ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ id: 'vto_job_colab_101', status: 'queued' }),
      });

      const job = await VTOJobClient.create({
        category: 'tops',
        garment_id: 'garm_colab_silk_top',
        person: mockPersonAsset,
        garment: mockGarmentAsset,
        outfit_name: 'Summer Look',
        idempotency_key: 'idem_colab_test_101_unique',
      });

      expect(job.id).toBe('vto_job_colab_101');
      expect(job.status).toBe('queued');

      expect((global as any).fetch).toHaveBeenCalledWith(
        'https://aura-colab-vto.ngrok-free.dev/v1/vto/jobs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock_supabase_colab_access_jwt',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            category: 'tops',
            garment_id: 'garm_colab_silk_top',
            person_input_storage_key: mockPersonAsset.objectKey,
            garment_input_storage_key: mockGarmentAsset.objectKey,
            outfit_name: 'Summer Look',
            idempotency_key: 'idem_colab_test_101_unique',
          }),
        })
      );
    });

    it('throws unauthorized error when Supabase access token is missing', async () => {
      (supabase!.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
      });

      await expect(
        VTOJobClient.create({
          category: 'tops',
          garment_id: 'garm_colab_silk_top',
          person: mockPersonAsset,
          garment: mockGarmentAsset,
          idempotency_key: 'idem_unauth_test',
        })
      ).rejects.toThrow('Your session expired. Please sign in again.');
    });
  });

  describe('3. Error Handling & Timeout Behavior', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_VTO_COLAB_URL = 'https://aura-colab-vto.ngrok-free.dev';
    });

    it('translates AbortError into friendly Colab/ngrok timeout message', async () => {
      const abortError = new Error('The operation was aborted.');
      abortError.name = 'AbortError';
      ((global as any).fetch as jest.Mock).mockRejectedValueOnce(abortError);

      await expect(
        VTOJobClient.create({
          category: 'tops',
          garment_id: 'garm_colab_silk_top',
          person: mockPersonAsset,
          garment: mockGarmentAsset,
          idempotency_key: 'idem_timeout_test',
        })
      ).rejects.toThrow('VTO request timed out. Please check your Colab / ngrok connection.');
    });

    it('surfaces backend error message when server responds with 401 or 500', async () => {
      ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid authentication token' }),
      });

      await expect(
        VTOJobClient.create({
          category: 'tops',
          garment_id: 'garm_colab_silk_top',
          person: mockPersonAsset,
          garment: mockGarmentAsset,
          idempotency_key: 'idem_401_test',
        })
      ).rejects.toThrow('Invalid authentication token');
    });
  });

  describe('4. Readiness and Health Checks (/health & /ready)', () => {
    const provider = new AuraDiffusionVTOProvider();

    it('returns available: true when /health is ok and /ready is true', async () => {
      process.env.EXPO_PUBLIC_VTO_COLAB_URL = 'https://aura-colab-vto.ngrok-free.dev';

      ((global as any).fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ok', message: 'VTO GPU service active and ready.' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ready: true }),
        });

      const health = await provider.isEngineAvailable();
      expect(health.available).toBe(true);
      expect(health.reason).toBe('VTO GPU service active and ready.');
    });

    it('returns available: false when /ready indicates models are still loading', async () => {
      process.env.EXPO_PUBLIC_VTO_COLAB_URL = 'https://aura-colab-vto.ngrok-free.dev';

      ((global as any).fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ok', message: 'VTO GPU service active and ready.' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ready: false }),
        });

      const health = await provider.isEngineAvailable();
      expect(health.available).toBe(false);
      expect(health.reason).toContain('VTO neural models (MMDiT / DWPose) are still initializing');
    });
  });

  describe('5. Real Person Image & Garment Cutout Enforcement', () => {
    const provider = new AuraDiffusionVTOProvider();

    it('rejects silhouette placeholder when attempting neural try-on', async () => {
      await expect(
        provider.generateTryOn({
          userId: mockUserId,
          userImageUrl: 'aura://personal_silhouette',
          garments: [mockGarment],
          outfitName: 'Test Look',
        })
      ).rejects.toThrow('A real photo from your Personal AURA Model is required');
    });

    it('auto-stages garment cutout to vto_inputs if not already staged', async () => {
      process.env.EXPO_PUBLIC_VTO_COLAB_URL = 'https://aura-colab-vto.ngrok-free.dev';

      jest.spyOn(provider, 'isEngineAvailable').mockResolvedValue({
        available: true,
        reason: 'Colab GPU active',
      });

      // Mock submit and poll
      ((global as any).fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ id: 'vto_job_stage_test', status: 'completed', result_signed_url: 'https://xyz.supabase.co/signed/vto_result.png' }),
        });

      const result = await provider.generateTryOn({
        userId: mockUserId,
        userImageUrl: 'file:///data/real_person_photo.jpg',
        garments: [mockGarment],
        outfitName: 'Test Staged Look',
      });

      expect(result.status).toBe('completed');
      expect(result.result_image_url).toBe('https://xyz.supabase.co/signed/vto_result.png');
      expect(result.provider).toBe('aura_diffusion_vto');
    });
  });

  describe('6. Offline Fallback & Scientific Honesty', () => {
    const provider = new AuraDiffusionVTOProvider();

    it('reports engine_unavailable honestly when ngrok tunnel is offline', async () => {
      process.env.EXPO_PUBLIC_VTO_COLAB_URL = 'https://unreachable-tunnel.ngrok-free.dev';
      ((global as any).fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

      const result = await provider.generateTryOn({
        userId: mockUserId,
        userImageUrl: 'file:///data/real_person_photo.jpg',
        garments: [mockGarment],
        outfitName: 'Test Offline Look',
      });

      expect(result.status).toBe('engine_unavailable');
      expect(result.result_image_url).toBe('');
      expect(result.errorMessage).toContain('Virtual Try-On is not available yet');
    });
  });
});
