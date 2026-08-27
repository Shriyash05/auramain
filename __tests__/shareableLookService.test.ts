import { ShareableLookService } from '../src/services/creator/shareableLookService';
import { CreatorService } from '../src/services/creator/creatorService';
import { LocalStorage } from '../src/services/storage/localStorage';
import { ShootLook } from '../src/types/creator';

describe('ShareableLookService', () => {
  const userId = 'shareable_look_user';

  const mockLook: ShootLook = {
    id: 'look_mock_1',
    shoot_id: 'shoot_mock_1',
    user_id: userId,
    outfit_id: 'outfit_mock_1',
    name: 'Evening Resort Tailoring',
    status: 'shot',
    tagged_garment_ids: ['g_top_1', 'g_bot_1'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    await LocalStorage.setItem(`aura_creator_profile_${userId}`, {
      user_id: userId,
      handle: 'aria_vogue',
      display_name: 'Aria Vogue',
      is_creator_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await LocalStorage.setItem(`aura_shoot_looks_${userId}`, [mockLook]);
    await LocalStorage.removeItem('aura_public_shareable_looks');
  });

  it('publishes a shareable look with sanitized public metadata and view counters', async () => {
    const published = await ShareableLookService.createAndPublishLook(
      userId,
      mockLook,
      'file:///final_photo.jpg',
      'Evening Resort Look',
      'Captured in Goa during golden hour.',
      [
        {
          garment_id: 'g_top_1',
          name: 'Linen Shirt',
          category: 'tops',
          primary_color: '#F0EFEA',
        },
      ]
    );

    expect(published.public_share_id).toBeDefined();
    expect(published.creator_handle).toBe('aria_vogue');
    expect(published.is_published).toBe(true);

    // Public fetch
    const publicFetched = await ShareableLookService.getPublicLookByShareId(published.public_share_id);
    expect(publicFetched).not.toBeNull();
    expect(publicFetched?.views_count).toBe(1); // Increment view count

    // Unpublish
    await ShareableLookService.unpublishLook(userId, published.public_share_id);
    const unpublishedFetched = await ShareableLookService.getPublicLookByShareId(published.public_share_id);
    expect(unpublishedFetched).toBeNull(); // Not publicly visible when unpublished
  });
});
