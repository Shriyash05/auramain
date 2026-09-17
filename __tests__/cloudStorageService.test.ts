import { CloudStorageService, StorageUploadError, UploadedImageAsset } from '../src/services/storage/cloudStorageService';
import { supabase, isSupabaseConfigured } from '../src/services/auth/authService';

jest.mock('../src/services/auth/authService', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
  isSupabaseConfigured: true,
}));

describe('CloudStorageService (Private Storage Contract)', () => {
  const userId = 'user_storage_test_01';
  let mockUpload: jest.Mock;
  let mockCreateSignedUrl: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload = jest.fn();
    mockCreateSignedUrl = jest.fn();

    (supabase!.storage.from as jest.Mock).mockReturnValue({
      upload: mockUpload,
      createSignedUrl: mockCreateSignedUrl,
    });
  });

  describe('uploadPrivateImage', () => {
    it('requires a valid local URI scheme (file:, content:, or data:image/)', async () => {
      // Remote HTTP URL must be rejected
      await expect(
        CloudStorageService.uploadPrivateImage('vto_inputs', userId, 'https://example.com/photo.jpg')
      ).rejects.toThrow(StorageUploadError);

      await expect(
        CloudStorageService.uploadPrivateImage('vto_inputs', userId, 'https://example.com/photo.jpg')
      ).rejects.toThrow('A local image URI is required for upload.');

      // Plain relative path without scheme must be rejected
      await expect(
        CloudStorageService.uploadPrivateImage('vto_inputs', userId, '/var/mobile/photo.jpg')
      ).rejects.toThrow('A local image URI is required for upload.');
    });

    it('successfully uploads local file:// image and returns UploadedImageAsset with bucket and objectKey', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: `${userId}/123456_abc.jpg` },
        error: null,
      });

      const asset = await CloudStorageService.uploadPrivateImage(
        'vto_inputs',
        userId,
        'file:///path/to/local_photo.jpg'
      );

      expect(asset.bucket).toBe('vto_inputs');
      expect(asset.objectKey).toBe(`${userId}/123456_abc.jpg`);
      expect(asset.mimeType).toBe('image/jpeg');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${userId}/`)),
        expect.objectContaining({ uri: 'file:///path/to/local_photo.jpg' }),
        expect.objectContaining({ upsert: false, contentType: 'image/jpeg' })
      );
    });

    it('correctly derives png and webp mime types', async () => {
      mockUpload.mockResolvedValueOnce({
        data: { path: `${userId}/transparent_garment.png` },
        error: null,
      });

      const assetPng = await CloudStorageService.uploadPrivateImage(
        'vto_inputs',
        userId,
        'file:///garment.png'
      );
      expect(assetPng.mimeType).toBe('image/png');

      mockUpload.mockResolvedValueOnce({
        data: { path: `${userId}/photo.webp` },
        error: null,
      });

      const assetWebp = await CloudStorageService.uploadPrivateImage(
        'vto_inputs',
        userId,
        'content://media/photo.webp'
      );
      expect(assetWebp.mimeType).toBe('image/webp');
    });

    it('throws StorageUploadError when upload returns an error', async () => {
      mockUpload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row level security policy violation' },
      });

      await expect(
        CloudStorageService.uploadPrivateImage('vto_inputs', userId, 'file:///error_case.jpg')
      ).rejects.toThrow('Row level security policy violation');
    });
  });

  describe('createDisplayUrl', () => {
    it('generates a short-lived display URL for a valid UploadedImageAsset', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://example.supabase.co/signed/display.jpg' },
        error: null,
      });

      const asset: UploadedImageAsset = {
        bucket: 'vto_inputs',
        objectKey: `${userId}/person.jpg`,
        mimeType: 'image/jpeg',
      };

      const url = await CloudStorageService.createDisplayUrl(asset, 300);
      expect(url).toBe('https://example.supabase.co/signed/display.jpg');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(`${userId}/person.jpg`, 300);
    });

    it('throws StorageUploadError when signed URL generation fails', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: null,
        error: { message: 'Object not found' },
      });

      const asset: UploadedImageAsset = {
        bucket: 'vto_inputs',
        objectKey: `${userId}/missing.jpg`,
        mimeType: 'image/jpeg',
      };

      await expect(
        CloudStorageService.createDisplayUrl(asset)
      ).rejects.toThrow('Could not create an image display URL.');
    });
  });
});
