import { LocalStorage } from '../storage/localStorage';
import { supabase, isSupabaseConfigured } from '../auth/authService';
import { CloudStorageService } from '../storage/cloudStorageService';
import { Garment } from '../../types/garment';
import { Outfit } from '../../types/outfit';
import { GarmentCategory } from '../../constants/categories';
import { INITIAL_SEED_GARMENTS } from './seedData';

const GARMENTS_KEY_PREFIX = 'aura_garments_';
const OUTFITS_KEY_PREFIX = 'aura_outfits_';

export const DatabaseService = {
  // --- GARMENT OPERATIONS ---
  async getGarments(userId: string): Promise<Garment[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('garments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data as Garment[];
    }
    const local = await LocalStorage.getItem<Garment[]>(`${GARMENTS_KEY_PREFIX}${userId}`);
    if (local !== null) return local;

    // Seed with initial curated fashion items on first session
    const seeded: Garment[] = INITIAL_SEED_GARMENTS.map((g, idx) => ({
      ...g,
      id: `seed_garm_${idx + 1}`,
      user_id: userId,
      created_at: new Date(Date.now() - idx * 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    }));

    await LocalStorage.setItem(`${GARMENTS_KEY_PREFIX}${userId}`, seeded);
    return seeded;
  },

  async addGarment(garment: Omit<Garment, 'id' | 'created_at' | 'updated_at'>): Promise<Garment> {
    const newGarment: Garment = {
      ...garment,
      id: 'garm_' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('garments').insert(newGarment);
    }

    const current = await this.getGarments(garment.user_id);
    const updated = [newGarment, ...current];
    await LocalStorage.setItem(`${GARMENTS_KEY_PREFIX}${garment.user_id}`, updated);
    return newGarment;
  },

  async updateGarment(userId: string, garmentId: string, updates: Partial<Garment>): Promise<Garment> {
    const current = await this.getGarments(userId);
    const index = current.findIndex((g) => g.id === garmentId);
    if (index === -1) throw new Error('Garment not found');

    const updatedGarment: Garment = {
      ...current[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    current[index] = updatedGarment;

    if (isSupabaseConfigured && supabase) {
      await supabase.from('garments').update(updatedGarment).eq('id', garmentId);
    }

    await LocalStorage.setItem(`${GARMENTS_KEY_PREFIX}${userId}`, current);
    return updatedGarment;
  },

  async deleteGarment(userId: string, garmentId: string): Promise<void> {
    const current = await this.getGarments(userId);
    const filtered = current.filter((g) => g.id !== garmentId);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('garments').delete().eq('id', garmentId);
    }

    await LocalStorage.setItem(`${GARMENTS_KEY_PREFIX}${userId}`, filtered);
  },

  async getGarmentsByCategory(userId: string, category: GarmentCategory): Promise<Garment[]> {
    const all = await this.getGarments(userId);
    return all.filter((g) => g.category === category);
  },

  // --- OUTFIT OPERATIONS ---
  async getOutfits(userId: string): Promise<Outfit[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as Outfit[];
    }
    const local = await LocalStorage.getItem<Outfit[]>(`${OUTFITS_KEY_PREFIX}${userId}`);
    return local || [];
  },

  async saveOutfit(outfit: Omit<Outfit, 'id' | 'created_at' | 'updated_at' | 'worn_count'>): Promise<Outfit> {
    const newOutfit: Outfit = {
      ...outfit,
      id: 'outfit_' + Math.random().toString(36).substring(2, 9),
      worn_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('outfits').insert(newOutfit);
    }

    const current = await this.getOutfits(outfit.user_id);
    const updated = [newOutfit, ...current];
    await LocalStorage.setItem(`${OUTFITS_KEY_PREFIX}${outfit.user_id}`, updated);
    return newOutfit;
  },

  async deleteOutfit(userId: string, outfitId: string): Promise<void> {
    const current = await this.getOutfits(userId);
    const filtered = current.filter((o) => o.id !== outfitId);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('outfits').delete().eq('id', outfitId);
    }

    await LocalStorage.setItem(`${OUTFITS_KEY_PREFIX}${userId}`, filtered);
  },

  async deleteUserAccountData(userId: string): Promise<void> {
    // Purge all persistent user collections
    await LocalStorage.removeItem(`${GARMENTS_KEY_PREFIX}${userId}`);
    await LocalStorage.removeItem(`${OUTFITS_KEY_PREFIX}${userId}`);
    await LocalStorage.removeItem(`aura_pref_signals_${userId}`);
    await LocalStorage.removeItem(`aura_feedback_events_${userId}`);
    await LocalStorage.removeItem(`aura_wear_logs_${userId}`);
    await LocalStorage.removeItem(`aura_planned_events_${userId}`);
    await LocalStorage.removeItem(`aura_inspirations_${userId}`);
    await LocalStorage.removeItem(`aura_user_model_photo_${userId}`);
    await LocalStorage.removeItem(`aura_tryon_results_${userId}`);
    await LocalStorage.removeItem(`aura_shoots_${userId}`);
    await LocalStorage.removeItem(`aura_shoot_looks_${userId}`);
    await LocalStorage.removeItem(`aura_lookbooks_${userId}`);
    await LocalStorage.removeItem(`aura_contributor_profile_${userId}`);
    await LocalStorage.removeItem(`aura_contributions_${userId}`);

    // Purge cloud storage objects
    try {
      await CloudStorageService.deleteUserStorageObjects(userId);
    } catch (e) {
      console.warn('[DatabaseService] Could not purge cloud storage objects:', e);
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('research_contributions').delete().eq('user_id', userId);
      await supabase.from('contributor_profiles').delete().eq('user_id', userId);
      await supabase.from('garments').delete().eq('user_id', userId);
      await supabase.from('outfits').delete().eq('user_id', userId);
      await supabase.from('feedback_events').delete().eq('user_id', userId);
      await supabase.from('wear_logs').delete().eq('user_id', userId);
      await supabase.from('planned_events').delete().eq('user_id', userId);
      await supabase.from('inspirations').delete().eq('user_id', userId);
      await supabase.from('shoots').delete().eq('user_id', userId);
      await supabase.from('shoot_looks').delete().eq('user_id', userId);
      await supabase.from('lookbooks').delete().eq('user_id', userId);
      await supabase.from('shareable_looks').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
    }
  },
};
