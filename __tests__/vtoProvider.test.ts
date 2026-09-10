import { vtoProvider, AuraDiffusionVTOProvider } from '../src/services/vto/vtoProvider';
import { MirrorService } from '../src/services/vto/mirrorService';
import { DatabaseService } from '../src/services/database/databaseService';
import { LocalStorage } from '../src/services/storage/localStorage';
import { Garment } from '../src/types/garment';

describe('Virtual Try-On / Mirror Service (Scientific Honesty & Architecture)', () => {
  const userId = 'user_vto_test_77';

  const mockGarments: Garment[] = [
    {
      id: 'garm_vto_top',
      user_id: userId,
      name: 'Oversized Silk Oxford',
      category: 'tops',
      original_image: 'file:///top1.jpg',
      processed_image: 'file:///top1_clean.png',
      primary_color: '#F0EFEA',
      fit: 'Oversized',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'garm_vto_bot',
      user_id: userId,
      name: 'Wide-Leg Trousers',
      category: 'bottoms',
      original_image: 'file:///bot1.jpg',
      processed_image: 'file:///bot1_clean.png',
      primary_color: '#2B2C2E',
      fit: 'Relaxed',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_garments_${userId}`, mockGarments);
    await LocalStorage.setItem(`aura_outfits_${userId}`, []);
    await LocalStorage.removeItem(`aura_user_model_photo_${userId}`);
    await LocalStorage.removeItem(`aura_user_model_data_${userId}`);
    await LocalStorage.removeItem(`aura_tryon_results_${userId}`);
  });

  it('honestly checks engine availability without faking AI inference', async () => {
    const check = await vtoProvider.isEngineAvailable();
    expect(check.available).toBe(false);
    expect(check.reason).toContain('Virtual Try-On is not available yet');
  });

  it('reports engine_unavailable status honestly when dedicated diffusion backend is absent', async () => {
    const statuses: string[] = [];

    const result = await vtoProvider.generateTryOn(
      {
        userId,
        userImageUrl: 'file:///user_fullbody.jpg',
        garments: mockGarments,
        outfitName: 'Test VTO Look',
      },
      (status) => statuses.push(status)
    );

    expect(result.id).toBeDefined();
    expect(result.status).toBe('engine_unavailable');
    expect(result.errorMessage).toContain('Virtual Try-On is not available yet');
    expect(result.garment_ids).toContain('garm_vto_top');
    expect(result.garment_ids).toContain('garm_vto_bot');
    expect(statuses).toContain('checking_model');
    expect(statuses).toContain('engine_unavailable');
  });

  it('completes pipeline when engine is active in test environment', async () => {
    const activeProvider = new AuraDiffusionVTOProvider();
    jest.spyOn(activeProvider, 'isEngineAvailable').mockResolvedValue({
      available: true,
      reason: 'Local runner ready',
    });

    const statuses: string[] = [];
    const result = await activeProvider.generateTryOn(
      {
        userId,
        userImageUrl: 'file:///user_fullbody.jpg',
        garments: mockGarments,
        outfitName: 'Test VTO Look',
      },
      (status) => statuses.push(status)
    );

    expect(result.status).toBe('completed');
    expect(statuses).toContain('checking_model');
    expect(statuses).toContain('processing');
  });

  it('rejects request gracefully if user photo is missing', async () => {
    await expect(
      vtoProvider.generateTryOn({
        userId,
        userImageUrl: '',
        garments: mockGarments,
        outfitName: 'Test Look',
      })
    ).rejects.toThrow('User reference photo is required');
  });

  it('manages single persistent personal AURA model and supports deletion', async () => {
    expect(await MirrorService.hasUserModel(userId)).toBe(false);

    await MirrorService.saveUserModelPhoto(userId, 'file:///private_photo.jpg');
    expect(await MirrorService.hasUserModel(userId)).toBe(true);

    const photo = await MirrorService.getUserModelPhoto(userId);
    expect(photo).toBe('file:///private_photo.jpg');

    const model = await MirrorService.getUserModel(userId);
    expect(model?.userId).toBe(userId);
    expect(model?.primaryPhotoUri).toBe('file:///private_photo.jpg');
    expect(model?.poses?.length).toBeGreaterThan(0);

    await MirrorService.deleteUserModelPhoto(userId);
    expect(await MirrorService.hasUserModel(userId)).toBe(false);
  });

  it('saves VTO look as an Outfit referencing garment IDs and records feedback', async () => {
    const saved = await MirrorService.saveTryOnOutfit(
      userId,
      'Mirror Approved Look',
      ['garm_vto_top', 'garm_vto_bot'],
      'vto_123'
    );

    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('Mirror Approved Look');
    expect(saved.garment_ids).toContain('garm_vto_top');

    const outfits = await DatabaseService.getOutfits(userId);
    expect(outfits.length).toBe(1);
  });
});
