import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppSettings, AppSettingsPatch } from '../types/settings';

export interface AuthUser {
  id: string;
  githubId: string;
  login: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  learningGoal: string;
}

export interface RemoteProgress {
  completedTopicIds: string[];
  bookmarkedTopicIds: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<Pick<AuthUser, 'name' | 'bio' | 'learningGoal'>>) => Promise<AuthUser | null>;
  refreshProgress: () => Promise<RemoteProgress | null>;
  syncProgress: (progress: RemoteProgress) => Promise<void>;
  refreshSettings: () => Promise<AppSettingsPatch | null>;
  syncSettings: (settings: AppSettings) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) return null;
  return response.json() as Promise<T>;
}

function csrfHeaders(): Record<string, string> {
  const token = document.cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith('pingala_csrf='))
    ?.slice('pingala_csrf='.length);
  return token ? { 'X-CSRF-Token': token } : {};
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/me', { credentials: 'include' });
      const payload = await readJson<{ user: AuthUser | null }>(response);
      if (response.ok && payload) setUser(payload.user);
    } catch {
      // The static Vite dev server has no Pages Functions runtime; stay anonymous locally.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(() => {
    window.location.assign('/auth/github');
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'include', headers: csrfHeaders() });
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (profile: Partial<Pick<AuthUser, 'name' | 'bio' | 'learningGoal'>>) => {
    if (!user) return null;
    try {
      const response = await fetch('/api/me/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(profile),
      });
      const payload = await readJson<{ user: AuthUser }>(response);
      if (response.ok && payload?.user) {
        setUser(payload.user);
        return payload.user;
      }
    } catch {
      // Keep local profile edits usable if the API is unavailable.
    }
    return null;
  }, [user]);

  const refreshProgress = useCallback(async () => {
    if (!user) return null;
    try {
      const response = await fetch('/api/progress', { credentials: 'include' });
      const payload = await readJson<RemoteProgress>(response);
      return response.ok ? payload : null;
    } catch {
      return null;
    }
  }, [user]);

  const syncProgress = useCallback(async (progress: RemoteProgress) => {
    if (!user) return;
    try {
      await fetch('/api/progress/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(progress),
      });
    } catch {
      // Local state remains the source of truth until the next successful sync.
    }
  }, [user]);

  const refreshSettings = useCallback(async () => {
    if (!user) return null;
    try {
      const response = await fetch('/api/me/settings', { credentials: 'include' });
      const payload = await readJson<{ settings: AppSettingsPatch | null }>(response);
      return response.ok ? payload?.settings || null : null;
    } catch {
      return null;
    }
  }, [user]);

  const syncSettings = useCallback(async (settings: AppSettings) => {
    if (!user) return;
    try {
      await fetch('/api/me/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ settings }),
      });
    } catch {
      // Local settings remain available until the next successful sync.
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    updateProfile,
    refreshProgress,
    syncProgress,
    refreshSettings,
    syncSettings,
  }), [isLoading, login, logout, refreshProgress, refreshSettings, syncProgress, syncSettings, updateProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
