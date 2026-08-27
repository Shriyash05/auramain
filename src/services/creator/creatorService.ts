import { LocalStorage } from '../storage/localStorage';
import { DatabaseService } from '../database/databaseService';
import { CreatorProfile, Shoot, ShootLook, Lookbook } from '../../types/creator';

const CREATOR_PROFILE_KEY_PREFIX = 'aura_creator_profile_';
const SHOOTS_KEY_PREFIX = 'aura_shoots_';
const SHOOT_LOOKS_KEY_PREFIX = 'aura_shoot_looks_';
const LOOKBOOKS_KEY_PREFIX = 'aura_lookbooks_';

export const CreatorService = {
  async getCreatorProfile(userId: string): Promise<CreatorProfile> {
    const profile = await LocalStorage.getItem<CreatorProfile>(`${CREATOR_PROFILE_KEY_PREFIX}${userId}`);
    if (profile) return profile;

    const defaultProfile: CreatorProfile = {
      user_id: userId,
      handle: 'creator_' + userId.substring(0, 5),
      display_name: 'AURA Creator',
      is_creator_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return defaultProfile;
  },

  async updateCreatorProfile(userId: string, updates: Partial<CreatorProfile>): Promise<CreatorProfile> {
    const current = await this.getCreatorProfile(userId);
    const updated: CreatorProfile = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await LocalStorage.setItem(`${CREATOR_PROFILE_KEY_PREFIX}${userId}`, updated);
    return updated;
  },

  async getShoots(userId: string): Promise<Shoot[]> {
    const list = await LocalStorage.getItem<Shoot[]>(`${SHOOTS_KEY_PREFIX}${userId}`);
    if (!list) return [];
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getShootById(userId: string, shootId: string): Promise<Shoot | null> {
    const list = await this.getShoots(userId);
    return list.find((s) => s.id === shootId) || null;
  },

  async createShoot(
    userId: string,
    data: Omit<Shoot, 'id' | 'user_id' | 'garment_capsule_ids' | 'look_ids' | 'status' | 'created_at' | 'updated_at'>
  ): Promise<Shoot> {
    const nowIso = new Date().toISOString();
    const newShoot: Shoot = {
      ...data,
      id: 'shoot_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      inspiration_ids: data.inspiration_ids || [],
      garment_capsule_ids: [],
      look_ids: [],
      status: 'planning',
      created_at: nowIso,
      updated_at: nowIso,
    };

    const current = await this.getShoots(userId);
    const updated = [newShoot, ...current];
    await LocalStorage.setItem(`${SHOOTS_KEY_PREFIX}${userId}`, updated);
    return newShoot;
  },

  async updateShoot(userId: string, shootId: string, updates: Partial<Shoot>): Promise<Shoot> {
    const list = await this.getShoots(userId);
    const idx = list.findIndex((s) => s.id === shootId);
    if (idx === -1) throw new Error('Shoot not found');

    const updated = {
      ...list[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[idx] = updated;
    await LocalStorage.setItem(`${SHOOTS_KEY_PREFIX}${userId}`, list);
    return updated;
  },

  async deleteShoot(userId: string, shootId: string): Promise<void> {
    const list = await this.getShoots(userId);
    const filtered = list.filter((s) => s.id !== shootId);
    await LocalStorage.setItem(`${SHOOTS_KEY_PREFIX}${userId}`, filtered);

    // Also remove associated shoot looks
    const looks = await this.getShootLooks(userId, shootId);
    const allLooks = await LocalStorage.getItem<ShootLook[]>(`${SHOOT_LOOKS_KEY_PREFIX}${userId}`) || [];
    const remainingLooks = allLooks.filter((l) => l.shoot_id !== shootId);
    await LocalStorage.setItem(`${SHOOT_LOOKS_KEY_PREFIX}${userId}`, remainingLooks);
  },

  async getShootLooks(userId: string, shootId: string): Promise<ShootLook[]> {
    const list = await LocalStorage.getItem<ShootLook[]>(`${SHOOT_LOOKS_KEY_PREFIX}${userId}`);
    if (!list) return [];
    return list.filter((l) => l.shoot_id === shootId);
  },

  async addShootLook(
    userId: string,
    data: Omit<ShootLook, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<ShootLook> {
    const nowIso = new Date().toISOString();
    const newLook: ShootLook = {
      ...data,
      id: 'look_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      tagged_garment_ids: data.tagged_garment_ids || [],
      created_at: nowIso,
      updated_at: nowIso,
    };

    const current = await LocalStorage.getItem<ShootLook[]>(`${SHOOT_LOOKS_KEY_PREFIX}${userId}`) || [];
    await LocalStorage.setItem(`${SHOOT_LOOKS_KEY_PREFIX}${userId}`, [newLook, ...current]);

    // Update shoot's look_ids
    const shoot = await this.getShootById(userId, data.shoot_id);
    if (shoot && !shoot.look_ids.includes(newLook.id)) {
      await this.updateShoot(userId, shoot.id, {
        look_ids: [...shoot.look_ids, newLook.id],
      });
    }

    return newLook;
  },

  async updateShootLook(userId: string, lookId: string, updates: Partial<ShootLook>): Promise<ShootLook> {
    const list = await LocalStorage.getItem<ShootLook[]>(`${SHOOT_LOOKS_KEY_PREFIX}${userId}`) || [];
    const idx = list.findIndex((l) => l.id === lookId && l.user_id === userId);
    if (idx === -1) throw new Error('Shoot look not found');

    const updated = {
      ...list[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[idx] = updated;
    await LocalStorage.setItem(`${SHOOT_LOOKS_KEY_PREFIX}${userId}`, list);
    return updated;
  },

  async getLookbooks(userId: string): Promise<Lookbook[]> {
    const list = await LocalStorage.getItem<Lookbook[]>(`${LOOKBOOKS_KEY_PREFIX}${userId}`);
    if (!list) return [];
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createLookbook(
    userId: string,
    data: Omit<Lookbook, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<Lookbook> {
    const nowIso = new Date().toISOString();
    const newBook: Lookbook = {
      ...data,
      id: 'lookbook_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const current = await this.getLookbooks(userId);
    const updated = [newBook, ...current];
    await LocalStorage.setItem(`${LOOKBOOKS_KEY_PREFIX}${userId}`, updated);
    return newBook;
  },

  async deleteLookbook(userId: string, lookbookId: string): Promise<void> {
    const list = await this.getLookbooks(userId);
    const filtered = list.filter((b) => b.id !== lookbookId);
    await LocalStorage.setItem(`${LOOKBOOKS_KEY_PREFIX}${userId}`, filtered);
  },
};
