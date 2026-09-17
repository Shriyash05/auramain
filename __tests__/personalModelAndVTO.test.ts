/**
 * Unit Tests for Personal AURA Model Onboarding & Virtual Try-On Service
 * 
 * Verifies Phase 8, 9, 10:
 * - AuraUserModel schema: separate proportions, sizes, body shape, face references
 * - Strict distinction: Face scan informs identity appearance; body geometry informed by proportions & sizes
 * - LocalStorage privacy: personal biometric measurements kept strictly private
 * - VirtualTryOnService abstraction: modular provider, honest engine status, zero fake AI renders
 */

import { MirrorService, AuraUserModel } from '../src/services/vto/mirrorService';
import { VirtualTryOnService } from '../src/services/vto/virtualTryOnService';
import { LocalStorage } from '../src/services/storage/localStorage';
import { Garment } from '../src/types/garment';

describe('Personal AURA Model Onboarding & VTO Service', () => {
  const testUserId = 'test_user_model_vto_99';

  beforeEach(async () => {
    await MirrorService.deleteUserModel(testUserId);
  });

  afterEach(async () => {
    await MirrorService.deleteUserModel(testUserId);
  });

  test('Personal Model Onboarding stores 5-step inputs with clear separation of face and body', async () => {
    const modelData: Partial<AuraUserModel> = {
      // Step 1: Proportions
      proportions: {
        heightCm: 182,
        heightUnit: 'cm',
        weightKg: 76,
        weightUnit: 'kg',
        waistInches: 32,
        chestInches: 40,
        inseamInches: 32,
      },
      // Step 2: Usual Sizes
      sizes: {
        tops: 'L',
        bottoms: '32',
        shoes: 'US 10.5',
      },
      // Step 3: Body Shape
      bodyShape: 'athletic',
      // Step 4: Face References (Identity appearance only, strictly distinct from body)
      faceReferences: [
        {
          id: 'face_ref_1',
          uri: 'file:///local/secure/face_ref_front.jpg',
          angle: 'front',
          capturedAt: new Date().toISOString(),
        },
      ],
      primaryFaceUri: 'file:///local/secure/face_ref_front.jpg',
      isReady: true,
    };

    const saved = await MirrorService.saveUserModel(testUserId, modelData);

    expect(saved.userId).toBe(testUserId);
    expect(saved.isReady).toBe(true);
    expect(saved.proportions?.heightCm).toBe(182);
    expect(saved.proportions?.weightKg).toBe(76);
    expect(saved.sizes?.tops).toBe('L');
    expect(saved.bodyShape).toBe('athletic');
    expect(saved.faceReferences?.length).toBe(1);
    expect(saved.primaryFaceUri).toBe('file:///local/secure/face_ref_front.jpg');

    // Verify persistence in LocalStorage
    const fetched = await MirrorService.getUserModel(testUserId);
    expect(fetched).not.toBeNull();
    expect(fetched?.proportions?.waistInches).toBe(32);
    expect(fetched?.sizes?.bottoms).toBe('32');

    // Verify hasUserModel
    const hasModel = await MirrorService.hasUserModel(testUserId);
    expect(hasModel).toBe(true);

    // Verify photo lookup resolves face reference
    const photo = await MirrorService.getUserModelPhoto(testUserId);
    expect(photo).toBe('file:///local/secure/face_ref_front.jpg');
  });

  test('VirtualTryOnService abstraction executes try-on with honest engine status', async () => {
    // 1. Set up test model
    await MirrorService.saveUserModel(testUserId, {
      proportions: { heightCm: 175, weightKg: 70 },
      sizes: { tops: 'M', bottoms: '30' },
      bodyShape: 'straight',
      primaryFaceUri: 'file:///local/secure/face_ref.jpg',
      isReady: true,
    });

    const mockGarment: Garment = {
      id: 'g_oxford_1',
      user_id: testUserId,
      name: 'Classic Oxford Shirt',
      category: 'tops',
      original_image: 'file:///assets/oxford.png',
      processed_image: 'file:///assets/oxford_clean.png',
      primary_color: '#3B82F6',
      favorite: false,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let reportedStatus = '';
    const result = await VirtualTryOnService.executeTryOn(testUserId, {
      garments: [mockGarment],
      outfitName: 'Oxford Look',
      onProgress: (st) => {
        reportedStatus = st;
      },
    });

    // Verify scientific honesty: engine_unavailable when neural inference weights are in development
    expect(result.status).toBe('engine_unavailable');
    expect(result.provider).toBe('aura_diffusion_vto');
    expect(result.result_image_url).toBe(''); // Never returns a fake render
    expect(result.errorMessage).toContain('Virtual Try-On is not available yet');
  });

  test('VirtualTryOnService throws if no personal model exists', async () => {
    const mockGarment: Garment = {
      id: 'g_shoe_1',
      user_id: 'no_model_user',
      name: 'Leather Loafers',
      category: 'shoes',
      original_image: 'file:///assets/loafers.png',
      primary_color: '#1C1917',
      favorite: false,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await expect(
      VirtualTryOnService.executeTryOn('no_model_user', {
        garments: [mockGarment],
      })
    ).rejects.toThrow('A personal AURA model is required before trying on garments.');
  });
});
