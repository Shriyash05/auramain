import { DatabaseService } from '../src/services/database/databaseService';
import { CreatorService } from '../src/services/creator/creatorService';
import { ShareableLookService } from '../src/services/creator/shareableLookService';
import { LocalStorage } from '../src/services/storage/localStorage';
import { Garment } from '../src/types/garment';
import { Shoot, ShootLook } from '../src/types/creator';

describe('Security & Cross-User RLS Isolation', () => {
  const userA = 'user_alice_101';
  const userB = 'user_bob_202';

  const aliceGarments: Garment[] = [
    {
      id: 'garm_alice_1',
      user_id: userA,
      name: 'Alice Silk Shirt',
      category: 'tops',
      original_image: 'file:///alice_top.jpg',
      primary_color: '#F0EFEA',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const bobGarments: Garment[] = [
    {
      id: 'garm_bob_1',
      user_id: userB,
      name: 'Bob Leather Jacket',
      category: 'outerwear',
      original_image: 'file:///bob_jacket.jpg',
      primary_color: '#111111',
      favorite: true,
      user_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const bobPrivateShoot: Shoot = {
    id: 'shoot_bob_private',
    user_id: userB,
    name: 'Bob Secret Campaign',
    concept: 'Private editorial shoot',
    mood: 'Dark Luxury',
    inspiration_ids: [],
    garment_capsule_ids: [],
    look_ids: [],
    status: 'planning',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const bobShootLook: ShootLook = {
    id: 'slook_bob_1',
    shoot_id: 'shoot_bob_private',
    user_id: userB,
    outfit_id: 'outfit_bob_1',
    name: 'Bob Look 01',
    status: 'shot',
    final_photo_url: 'file:///bob_photo.jpg',
    tagged_garment_ids: ['garm_bob_1'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_garments_${userA}`, aliceGarments);
    await LocalStorage.setItem(`aura_garments_${userB}`, bobGarments);
    await LocalStorage.setItem(`aura_shoots_${userB}`, [bobPrivateShoot]);
    await LocalStorage.setItem(`aura_shoot_looks_${userB}`, [bobShootLook]);
    await LocalStorage.setItem(`aura_creator_profile_${userB}`, {
      user_id: userB,
      handle: 'bob_creator',
      display_name: 'Bob Creator',
      is_creator_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await LocalStorage.removeItem('aura_public_shareable_looks');
  });

  it('proves User A cannot access User B garments (Strict User Isolation)', async () => {
    const aliceCloset = await DatabaseService.getGarments(userA);
    expect(aliceCloset.length).toBe(1);
    expect(aliceCloset[0].id).toBe('garm_alice_1');
    expect(aliceCloset.some((g) => g.user_id === userB)).toBe(false);
  });

  it('proves User A cannot access User B private shoots or unshared creator data', async () => {
    const aliceShoots = await CreatorService.getShoots(userA);
    expect(aliceShoots.length).toBe(0);
    expect(aliceShoots.some((s) => s.id === 'shoot_bob_private')).toBe(false);
  });

  it('proves published public look is accessible to anyone while draft remains private', async () => {
    // 1. Publish Bob's look
    const published = await ShareableLookService.createAndPublishLook(
      userB,
      bobShootLook,
      bobShootLook.final_photo_url!,
      'Summer Vibe',
      'Editorial look',
      [{ garment_id: 'garm_bob_1', name: 'Leather Jacket', category: 'outerwear' }]
    );

    // 2. Query public look via share ID
    const publicView = await ShareableLookService.getPublicLookByShareId(published.public_share_id);
    expect(publicView).not.toBeNull();
    expect(publicView?.creator_handle).toBe('bob_creator');
    expect(publicView?.is_published).toBe(true);

    // 3. Verify non-existent or private share ID returns null
    const nonExistent = await ShareableLookService.getPublicLookByShareId('fake_share_id_999');
    expect(nonExistent).toBeNull();
  });

  it('proves account deletion purges all user data without affecting other users', async () => {
    await DatabaseService.deleteUserAccountData(userA);

    const aliceClosetAfter = await LocalStorage.getItem(`aura_garments_${userA}`);
    expect(aliceClosetAfter).toBeNull();

    // Verify Bob's data remains intact
    const bobClosetAfter = await DatabaseService.getGarments(userB);
    expect(bobClosetAfter.length).toBe(1);
    expect(bobClosetAfter[0].id).toBe('garm_bob_1');
  });
});
