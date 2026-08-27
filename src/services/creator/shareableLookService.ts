import { Share } from 'react-native';
import { LocalStorage } from '../storage/localStorage';
import { CreatorService } from './creatorService';
import { DatabaseService } from '../database/databaseService';
import { FeedbackService } from '../feedback/feedbackService';
import { PreferenceLearningService } from '../stylist/preferenceLearningService';
import { ShareableLook, ShootLook, TaggedGarmentSummary } from '../../types/creator';

const PUBLIC_LOOKS_KEY = 'aura_public_shareable_looks';

export const ShareableLookService = {
  async getAllPublicLooks(): Promise<ShareableLook[]> {
    const list = await LocalStorage.getItem<ShareableLook[]>(PUBLIC_LOOKS_KEY);
    return list || [];
  },

  async getPublicLookByShareId(shareId: string): Promise<ShareableLook | null> {
    const list = await this.getAllPublicLooks();
    const found = list.find((l) => l.public_share_id === shareId);
    if (found && found.is_published) {
      // Increment view count
      found.views_count = (found.views_count || 0) + 1;
      await LocalStorage.setItem(PUBLIC_LOOKS_KEY, list);
      return found;
    }
    return null;
  },

  async createAndPublishLook(
    userId: string,
    look: ShootLook,
    finalPhotoUrl: string,
    title: string,
    caption: string,
    taggedGarments: TaggedGarmentSummary[]
  ): Promise<ShareableLook> {
    const profile = await CreatorService.getCreatorProfile(userId);
    const nowIso = new Date().toISOString();
    const publicShareId = 'look_' + Math.random().toString(36).substring(2, 9);

    const shareableLook: ShareableLook = {
      id: 'pub_' + Math.random().toString(36).substring(2, 9),
      public_share_id: publicShareId,
      user_id: userId,
      creator_handle: profile.handle,
      creator_display_name: profile.display_name,
      final_photo_url: finalPhotoUrl,
      title: title || look.name,
      caption,
      tagged_garments: taggedGarments,
      is_published: true,
      views_count: 0,
      saves_count: 0,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Update shoot look status to published
    await CreatorService.updateShootLook(userId, look.id, {
      status: 'published',
      final_photo_url: finalPhotoUrl,
      tagged_garment_ids: taggedGarments.map((t) => t.garment_id),
    });

    const allPublic = await this.getAllPublicLooks();
    const updated = [shareableLook, ...allPublic];
    await LocalStorage.setItem(PUBLIC_LOOKS_KEY, updated);

    // Record preference learning signal (publishing a look is a strong positive signal)
    const event = await FeedbackService.recordEvent(userId, 'save', look.outfit_id, {
      public_share_id: publicShareId,
      action: 'publish_creator_look',
    });
    const allGarments = await DatabaseService.getGarments(userId);
    const tagged = allGarments.filter((g) => taggedGarments.some((t) => t.garment_id === g.id));
    await PreferenceLearningService.recordFeedbackLearning(userId, event, tagged);

    return shareableLook;
  },

  async unpublishLook(userId: string, shareId: string): Promise<void> {
    const allPublic = await this.getAllPublicLooks();
    const idx = allPublic.findIndex((l) => l.public_share_id === shareId && l.user_id === userId);
    if (idx !== -1) {
      allPublic[idx].is_published = false;
      allPublic[idx].updated_at = new Date().toISOString();
      await LocalStorage.setItem(PUBLIC_LOOKS_KEY, allPublic);
    }
  },

  async shareLookViaNativeSheet(look: ShareableLook): Promise<void> {
    try {
      const shareUrl = `https://aura.app/look/${look.public_share_id}`;
      await Share.share({
        title: `${look.title} by @${look.creator_handle}`,
        message: `Check out "${look.title}" styled on AURA: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (e) {
      // User dismissed or share sheet error
    }
  },
};
