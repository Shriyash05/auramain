import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthService } from '../services/auth/authService';
import { UserProfile } from '../types/user';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithEmail: (email: string) => Promise<UserProfile>;
  loginAsGuest: () => Promise<UserProfile>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = async () => {
    try {
      setIsLoading(true);
      const sessionUser = await AuthService.getCurrentSession();
      setUser(sessionUser);
    } catch (e) {
      console.error('[AuthContext] Session load error:', e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const loginWithEmail = async (email: string) => {
    const u = await AuthService.loginWithEmail(email);
    setUser(u);
    return u;
  };

  const loginAsGuest = async () => {
    const u = await AuthService.loginAsGuest();
    setUser(u);
    return u;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const u = await AuthService.updateProfile(updates);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        loginWithEmail,
        loginAsGuest,
        updateProfile,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
