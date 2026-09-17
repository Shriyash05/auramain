import { VTOJobClient, VTOJobRequest } from '../src/services/vto/vtoJobClient';
import { supabase, isSupabaseConfigured } from '../src/services/auth/authService';
import { UploadedImageAsset } from '../src/services/storage/cloudStorageService';

jest.mock('../src/services/auth/authService', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
  isSupabaseConfigured: true,
}));

describe('VTOJobClient (Storage Contract & API Client Tests)', () => {
  const originalEnv = process.env.EXPO_PUBLIC_VTO_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_VTO_API_URL = 'http://127.0.0.1:8001';
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
    (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: 'mock_jwt_access_token_12345',
        },
      },
    });
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_VTO_API_URL = originalEnv;
  });

  const validPerson: UploadedImageAsset = {
    bucket: 'vto_inputs',
    objectKey: 'user_123/person_1.jpg',
    mimeType: 'image/jpeg',
  };

  const validGarment: UploadedImageAsset = {
    bucket: 'vto_inputs',
    objectKey: 'user_123/garment_1.png',
    mimeType: 'image/png',
  };

  describe('assertVtoInput & Storage Contract Enforcement', () => {
    it('rejects person asset with device file:// URI', async () => {
      const invalidPerson: UploadedImageAsset = {
        bucket: 'vto_inputs',
        objectKey: 'file:///data/user/0/cache/photo.jpg',
        mimeType: 'image/jpeg',
      };

      await expect(
        VTOJobClient.create({
          category: 'tops',
          garment_id: 'garm_1',
          person: invalidPerson,
          garment: validGarment,
          idempotency_key: 'idem_test_key_0001',
        })
      ).rejects.toThrow('VTO requires a private Storage object key. Upload the image first.');
    });

    it('rejects garment asset with full remote URL containing protocol', async () => {
      const invalidGarment: UploadedImageAsset = {
        bucket: 'vto_inputs',
        objectKey: 'https://example.supabase.co/storage/v1/object/public/garment.png',
        mimeType: 'image/png',
      };

      await expect(
        VTOJobClient.create({
          category: 'tops',
          garment_id: 'garm_1',
          person: validPerson,
          garment: invalidGarment,
          idempotency_key: 'idem_test_key_0002',
        })
      ).rejects.toThrow('VTO requires a private Storage object key. Upload the image first.');
    });

    it('rejects assets missing bucket or objectKey', async () => {
      const emptyAsset = {} as UploadedImageAsset;

      await expect(
        VTOJobClient.create({
          category: 'tops',
          garment_id: 'garm_1',
          person: emptyAsset,
          garment: validGarment,
          idempotency_key: 'idem_test_key_0003',
        })
      ).rejects.toThrow('VTO requires a private Storage object key. Upload the image first.');
    });
  });

  describe('Category Validation', () => {
    it('rejects unsupported categories (e.g. shoes, outerwear)', async () => {
      await expect(
        VTOJobClient.create({
          category: 'shoes' as any,
          garment_id: 'garm_shoes',
          person: validPerson,
          garment: validGarment,
          idempotency_key: 'idem_test_key_0004',
        })
      ).rejects.toThrow('Only tops and bottoms are supported.');
    });

    it('permits tops and bottoms', async () => {
      ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'vto_job_tops_1', status: 'queued' }),
      });

      const job = await VTOJobClient.create({
        category: 'tops',
        garment_id: 'garm_top_1',
        person: validPerson,
        garment: validGarment,
        idempotency_key: 'idem_test_key_0005',
      });

      expect(job.id).toBe('vto_job_tops_1');
      expect(job.status).toBe('queued');
    });
  });

  describe('Authentication & Headers', () => {
    it('attaches Supabase Bearer token and JSON headers to requests', async () => {
      ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'vto_job_auth_1', status: 'queued' }),
      });

      await VTOJobClient.create({
        category: 'bottoms',
        garment_id: 'garm_bot_1',
        person: validPerson,
        garment: validGarment,
        idempotency_key: 'idem_test_key_0006',
      });

      expect((global as any).fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8001/v1/vto/jobs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock_jwt_access_token_12345',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('fails closed when user session is expired or missing', async () => {
      (supabase!.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
      });

      await expect(
        VTOJobClient.create({
          category: 'tops',
          garment_id: 'garm_1',
          person: validPerson,
          garment: validGarment,
          idempotency_key: 'idem_test_key_0007',
        })
      ).rejects.toThrow('Your session expired. Please sign in again.');
    });

    it('fails closed when VTO API URL is empty or unconfigured', async () => {
      process.env.EXPO_PUBLIC_VTO_API_URL = '';

      await expect(
        VTOJobClient.create({
          category: 'tops',
          garment_id: 'garm_1',
          person: validPerson,
          garment: validGarment,
          idempotency_key: 'idem_test_key_0008',
        })
      ).rejects.toThrow('VTO service is not configured.');
    });
  });

  describe('Idempotency & Polling', () => {
    it('prevents concurrent duplicate submissions with same idempotency key', async () => {
      let resolveFirst: any;
      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      ((global as any).fetch as jest.Mock).mockImplementationOnce(() => firstPromise);

      const submit1 = VTOJobClient.create({
        category: 'tops',
        garment_id: 'garm_1',
        person: validPerson,
        garment: validGarment,
        idempotency_key: 'idem_duplicate_test_key',
      });

      await expect(
        VTOJobClient.create({
          category: 'tops',
          garment_id: 'garm_1',
          person: validPerson,
          garment: validGarment,
          idempotency_key: 'idem_duplicate_test_key',
        })
      ).rejects.toThrow('A matching VTO job is already being submitted.');

      resolveFirst({
        ok: true,
        json: async () => ({ id: 'vto_job_resolved', status: 'queued' }),
      });

      await submit1;
    });

    it('polls job status with get(id)', async () => {
      ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'vto_job_poll_1',
          status: 'completed',
          result_signed_url: 'https://example.supabase.co/signed/result.png',
        }),
      });

      const polled = await VTOJobClient.get('vto_job_poll_1');
      expect(polled.id).toBe('vto_job_poll_1');
      expect(polled.status).toBe('completed');
      expect(polled.result_signed_url).toBeDefined();
    });

    it('cancels job with cancel(id)', async () => {
      ((global as any).fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'vto_job_cancel_1',
          status: 'cancelled',
        }),
      });

      const cancelled = await VTOJobClient.cancel('vto_job_cancel_1');
      expect(cancelled.id).toBe('vto_job_cancel_1');
      expect(cancelled.status).toBe('cancelled');
    });
  });
});
