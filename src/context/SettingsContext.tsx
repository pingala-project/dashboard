import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { AppSettings, AppSettingsPatch, UserProfile, AppearanceSettings, DisplaySettings, LearningSettings } from '../types/settings';
import { useAuth } from './AuthContext';

const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    name: '',
    email: '',
    github: '',
    bio: '',
    learningGoal: '',
  },
  appearance: {
    theme: 'light',
    codeTheme: 'onedark',
  },
  display: {
    fontFamily: 'sans',
    fontSize: 'standard',
    readingWidth: 'standard',
    enableLineNumbers: false,
  },
  learning: {
    confettiEnabled: true,
    autoAdvanceOnComplete: false,
    instantQuizFeedback: true,
    copyCodeWithComments: true,
  },
  accentColor: '#2563eb',
};

const STORAGE_KEY = 'pingala_app_settings_v1';

function readLegacySettings(): Partial<AppSettings> | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function mergeSettings(current: AppSettings, remote: AppSettingsPatch, user: { name: string; login: string; email: string | null; bio: string; learningGoal: string; avatarUrl: string | null }): AppSettings {
  return {
    ...current,
    profile: {
      ...current.profile,
      ...remote.profile,
      name: user.name,
      github: user.login,
      bio: user.bio,
      learningGoal: user.learningGoal,
      ...(user.email ? { email: user.email } : {}),
      ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
    },
    appearance: { ...current.appearance, ...remote.appearance },
    display: { ...current.display, ...remote.display },
    learning: { ...current.learning, ...remote.learning },
    ...(remote.accentColor ? { accentColor: remote.accentColor } : {}),
  };
}

interface SettingsContextType {
  settings: AppSettings;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateAppearance: (appearance: Partial<AppearanceSettings>) => void;
  updateDisplay: (display: Partial<DisplaySettings>) => void;
  updateLearning: (learning: Partial<LearningSettings>) => void;
  updateAccentColor: (accentColor: string) => void;
  resetAllSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateProfile: updateRemoteProfile, refreshSettings, syncSettings } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  const [remoteSettingsHydrated, setRemoteSettingsHydrated] = useState(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (!user) {
      setRemoteSettingsHydrated(false);
      setSettings(DEFAULT_SETTINGS);
      return;
    }

    let active = true;
    const legacySettings = readLegacySettings();
    const localSettings = legacySettings
      ? { ...DEFAULT_SETTINGS, ...legacySettings, profile: { ...DEFAULT_SETTINGS.profile, ...legacySettings.profile }, appearance: { ...DEFAULT_SETTINGS.appearance, ...legacySettings.appearance }, display: { ...DEFAULT_SETTINGS.display, ...legacySettings.display }, learning: { ...DEFAULT_SETTINGS.learning, ...legacySettings.learning } }
      : settingsRef.current;
    void (async () => {
      const remote = await refreshSettings();
      if (!active) return;
      if (remote) {
        setSettings((previous) => mergeSettings(previous, remote, user));
        localStorage.removeItem(STORAGE_KEY);
      } else {
        setSettings(mergeSettings(localSettings, {}, user));
        const synced = await syncSettings(localSettings);
        if (synced) localStorage.removeItem(STORAGE_KEY);
      }
      if (active) setRemoteSettingsHydrated(true);
    })();

    return () => { active = false; };
  }, [refreshSettings, syncSettings, user]);

  useEffect(() => {
    if (!user || !remoteSettingsHydrated) return;
    const timer = window.setTimeout(() => { void syncSettings(settings); }, 300);
    return () => window.clearTimeout(timer);
  }, [remoteSettingsHydrated, settings, syncSettings, user]);

  // Apply Theme & Display variables to HTML element
  useEffect(() => {
    const root = document.documentElement;

    // Theme mode handling
    const resolvedTheme = settings.appearance.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.appearance.theme;

    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-font', settings.display.fontFamily);
    root.setAttribute('data-font-size', settings.display.fontSize);
    root.setAttribute('data-reading-width', settings.display.readingWidth);
    root.setAttribute('data-code-theme', settings.appearance.codeTheme);
    root.style.setProperty('--accent', settings.accentColor);

    // If system theme, listen for OS changes
    if (settings.appearance.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.accentColor, settings.appearance.codeTheme, settings.appearance.theme, settings.display.fontFamily, settings.display.fontSize, settings.display.readingWidth]);

  const updateProfile = (profileUpdate: Partial<UserProfile>) => {
    setSettings((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...profileUpdate },
    }));
    if (user) {
      const remoteProfile = {
        ...(profileUpdate.name !== undefined ? { name: profileUpdate.name } : {}),
        ...(profileUpdate.bio !== undefined ? { bio: profileUpdate.bio } : {}),
        ...(profileUpdate.learningGoal !== undefined ? { learningGoal: profileUpdate.learningGoal } : {}),
      };
      if (Object.keys(remoteProfile).length > 0) void updateRemoteProfile(remoteProfile);
    }
  };

  const updateAppearance = (appearanceUpdate: Partial<AppearanceSettings>) => {
    setSettings((prev) => ({
      ...prev,
      appearance: { ...prev.appearance, ...appearanceUpdate },
    }));
  };

  const updateDisplay = (displayUpdate: Partial<DisplaySettings>) => {
    setSettings((prev) => ({
      ...prev,
      display: { ...prev.display, ...displayUpdate },
    }));
  };

  const updateLearning = (learningUpdate: Partial<LearningSettings>) => {
    setSettings((prev) => ({
      ...prev,
      learning: { ...prev.learning, ...learningUpdate },
    }));
  };

  const updateAccentColor = (accentColor: string) => {
    setSettings((prev) => ({ ...prev, accentColor }));
  };

  const resetAllSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateProfile,
        updateAppearance,
        updateDisplay,
        updateLearning,
        updateAccentColor,
        resetAllSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
