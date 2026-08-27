import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LocalStorage } from '../storage/localStorage';
import { UserProfile } from '../../types/user';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const AUTH_USER_KEY = 'aura_auth_user_session';

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const AuthService = {
  async getCurrentSession(): Promise<UserProfile | null> {
    if (isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const storedProfile = await LocalStorage.getItem<UserProfile>(AUTH_USER_KEY);
        return storedProfile || {
          id: session.user.id,
          email: session.user.email,
          display_name: session.user.user_metadata?.full_name || 'AURA Member',
          onboarding_completed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }
    return LocalStorage.getItem<UserProfile>(AUTH_USER_KEY);
  },

  async loginWithEmail(email: string): Promise<UserProfile> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
    }
    
    // In local / test mode or fallback, establish user session
    const existing = await LocalStorage.getItem<UserProfile>(AUTH_USER_KEY);
    const profile: UserProfile = existing || {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email,
      display_name: email.split('@')[0] || 'Fashion Enthusiast',
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await LocalStorage.setItem(AUTH_USER_KEY, profile);
    return profile;
  },

  async loginAsGuest(): Promise<UserProfile> {
    const guestUser: UserProfile = {
      id: 'guest_aura_' + Math.random().toString(36).substring(2, 7),
      display_name: 'AURA Explorer',
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await LocalStorage.setItem(AUTH_USER_KEY, guestUser);
    return guestUser;
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const current = await this.getCurrentSession();
    if (!current) throw new Error('No authenticated user session');

    const updated: UserProfile = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('profiles').upsert(updated);
    }

    await LocalStorage.setItem(AUTH_USER_KEY, updated);
    return updated;
  },

  async logout(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    await LocalStorage.removeItem(AUTH_USER_KEY);
  },
};
