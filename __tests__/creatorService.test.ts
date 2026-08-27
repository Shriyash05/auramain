import { CreatorService } from '../src/services/creator/creatorService';
import { LocalStorage } from '../src/services/storage/localStorage';

describe('CreatorService', () => {
  const userIdA = 'creator_user_a';
  const userIdB = 'creator_user_b';

  beforeEach(async () => {
    await LocalStorage.removeItem(`aura_creator_profile_${userIdA}`);
    await LocalStorage.removeItem(`aura_shoots_${userIdA}`);
    await LocalStorage.removeItem(`aura_shoot_looks_${userIdA}`);
    await LocalStorage.removeItem(`aura_lookbooks_${userIdA}`);
  });

  it('initializes and updates creator profile', async () => {
    const defaultProf = await CreatorService.getCreatorProfile(userIdA);
    expect(defaultProf.is_creator_enabled).toBe(false);

    const updated = await CreatorService.updateCreatorProfile(userIdA, {
      handle: 'fashion_icon',
      display_name: 'Fashion Icon',
      is_creator_enabled: true,
      bio: 'Editorial fashion and campaign styling.',
    });

    expect(updated.handle).toBe('fashion_icon');
    expect(updated.is_creator_enabled).toBe(true);
  });

  it('manages shoot lifecycle and looks', async () => {
    const shoot = await CreatorService.createShoot(userIdA, {
      name: 'Resort Campaign 2026',
      concept: 'Breezy linen textures and relaxed tailoring',
      mood: 'Resort',
      occasion: 'Campaign',
      location: 'Goa',
      inspiration_ids: [],
    });

    expect(shoot.id).toBeDefined();
    expect(shoot.status).toBe('planning');

    const look = await CreatorService.addShootLook(userIdA, {
      shoot_id: shoot.id,
      outfit_id: 'outfit_123',
      name: 'Look 01: Linen Suit',
      status: 'selected',
      tagged_garment_ids: ['garm_1', 'garm_2'],
    });

    expect(look.id).toBeDefined();
    expect(look.status).toBe('selected');

    const looks = await CreatorService.getShootLooks(userIdA, shoot.id);
    expect(looks.length).toBe(1);

    // Update status
    const updatedLook = await CreatorService.updateShootLook(userIdA, look.id, {
      status: 'shot',
      final_photo_url: 'file:///final_shot.jpg',
    });
    expect(updatedLook.status).toBe('shot');
    expect(updatedLook.final_photo_url).toBe('file:///final_shot.jpg');
  });

  it('enforces strict user isolation for shoots', async () => {
    await CreatorService.createShoot(userIdA, {
      name: 'User A Private Shoot',
      concept: 'Secret Brand Campaign',
      inspiration_ids: [],
    });

    const userBShoots = await CreatorService.getShoots(userIdB);
    expect(userBShoots.length).toBe(0);
  });
});
