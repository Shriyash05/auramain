import { LocalStorage } from '../storage/localStorage';
import { DatabaseService } from '../database/databaseService';
import { FeedbackService } from '../feedback/feedbackService';
import { PreferenceLearningService } from '../stylist/preferenceLearningService';
import { inspirationAnalysisProvider } from './inspirationAnalysisProvider';
import { InspirationMatchingService } from './inspirationMatchingService';
import { InspirationItem } from '../../types/inspiration';
import { Outfit } from '../../types/outfit';

const INSPIRATIONS_KEY_PREFIX = 'aura_inspirations_';

export const InspirationService = {
  async getInspirations(userId: string): Promise<InspirationItem[]> {
    const list = await LocalStorage.getItem<InspirationItem[]>(`${INSPIRATIONS_KEY_PREFIX}${userId}`);
    if (!list) return [];
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createInspiration(
    userId: string,
    imageUri: string,
    sourceType: 'gallery' | 'camera' | 'curated' | 'import' = 'gallery'
  ): Promise<InspirationItem> {
    const wardrobe = await DatabaseService.getGarments(userId);
    const analysis = await inspirationAnalysisProvider.analyzeInspiration(imageUri);
    const matchedPieces = InspirationMatchingService.matchPieces(analysis.extracted_pieces, wardrobe);

    const nowIso = new Date().toISOString();
    const newItem: InspirationItem = {
      id: 'insp_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      image_url: imageUri,
      source_type: sourceType,
      title: analysis.title,
      style_formula: analysis.style_formula,
      aesthetic: analysis.aesthetic,
      mood: analysis.mood,
      occasion: analysis.occasion,
      extracted_pieces: analysis.extracted_pieces,
      matched_pieces: matchedPieces,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const current = await this.getInspirations(userId);
    const updated = [newItem, ...current];
    await LocalStorage.setItem(`${INSPIRATIONS_KEY_PREFIX}${userId}`, updated);
    return newItem;
  },

  async saveAuraVersionAsOutfit(userId: string, inspirationId: string): Promise<Outfit> {
    const inspirations = await this.getInspirations(userId);
    const targetIdx = inspirations.findIndex((i) => i.id === inspirationId);
    if (targetIdx === -1) throw new Error('Inspiration not found');

    const insp = inspirations[targetIdx];
    const userGarmentIds = insp.matched_pieces
      .map((m) => m.user_garment_id)
      .filter(Boolean) as string[];

    if (userGarmentIds.length === 0) {
      throw new Error('No matched closet pieces to create outfit');
    }

    const savedOutfit = await DatabaseService.saveOutfit({
      user_id: userId,
      name: `AURA: ${insp.title}`,
      source: 'inspiration',
      garment_ids: userGarmentIds,
      occasion: insp.occasion as any,
      notes: `Recreated from style formula: ${insp.style_formula}`,
      favorite: true,
    });

    inspirations[targetIdx] = {
      ...insp,
      aura_version_outfit_id: savedOutfit.id,
      updated_at: new Date().toISOString(),
    };
    await LocalStorage.setItem(`${INSPIRATIONS_KEY_PREFIX}${userId}`, inspirations);

    // Record learning event
    const event = await FeedbackService.recordEvent(userId, 'save', savedOutfit.id, {
      inspiration_id: inspirationId,
      style_formula: insp.style_formula,
    });
    const allGarments = await DatabaseService.getGarments(userId);
    const matchedGarments = allGarments.filter((g) => userGarmentIds.includes(g.id));
    await PreferenceLearningService.recordFeedbackLearning(userId, event, matchedGarments);

    return savedOutfit;
  },

  async deleteInspiration(userId: string, inspirationId: string): Promise<void> {
    const list = await this.getInspirations(userId);
    const filtered = list.filter((i) => i.id !== inspirationId);
    await LocalStorage.setItem(`${INSPIRATIONS_KEY_PREFIX}${userId}`, filtered);
  },
};
