import { AuthService } from '../src/services/auth/authService';
import { LocalStorage } from '../src/services/storage/localStorage';

describe('AuthService', () => {
  beforeEach(async () => {
    await LocalStorage.removeItem('aura_auth_user_session');
  });

  it('should authenticate user with email', async () => {
    const user = await AuthService.loginWithEmail('alex@fashion.com');
    expect(user).toBeDefined();
    expect(user.email).toBe('alex@fashion.com');
    expect(user.onboarding_completed).toBe(false);

    const session = await AuthService.getCurrentSession();
    expect(session?.email).toBe('alex@fashion.com');
  });

  it('should support guest exploration session', async () => {
    const guest = await AuthService.loginAsGuest();
    expect(guest.id).toContain('guest_aura_');
    expect(guest.onboarding_completed).toBe(false);
  });

  it('should update user profile upon onboarding completion', async () => {
    const user = await AuthService.loginWithEmail('style@aura.app');
    const updated = await AuthService.updateProfile({
      onboarding_completed: true,
      appearance: {
        fit_preference: 'oversized',
        style_vibes: ['Streetwear', 'Minimalist'],
      },
    });

    expect(updated.onboarding_completed).toBe(true);
    expect(updated.appearance?.fit_preference).toBe('oversized');
  });

  it('should clear session on logout', async () => {
    await AuthService.loginWithEmail('temp@aura.app');
    await AuthService.logout();
    const session = await AuthService.getCurrentSession();
    expect(session).toBeNull();
  });
});
