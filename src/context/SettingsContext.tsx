import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppSettings, UserProfile, AppearanceSettings, DisplaySettings, LearningSettings } from '../types/settings';
import { useAuth } from './AuthContext';

const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    name: 'Rishabh',
    email: 'rishabh.g23csai@nst.rishihood.edu.in',
    github: 'rishabh',
    bio: 'Learning AI & Machine Learning from first principles with Pingala.',
    learningGoal: 'Master Foundations & Transformer Architectures',
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
};

const STORAGE_KEY = 'pingala_app_settings_v1';

interface SettingsContextType {
  settings: AppSettings;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateAppearance: (appearance: Partial<AppearanceSettings>) => void;
  updateDisplay: (display: Partial<DisplaySettings>) => void;
  updateLearning: (learning: Partial<LearningSettings>) => void;
  resetAllSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateProfile: updateRemoteProfile } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error loading settings from storage', e);
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    if (!user) return;
    setSettings((previous) => ({
      ...previous,
      profile: {
        ...previous.profile,
        name: user.name,
        github: user.login,
        bio: user.bio,
        learningGoal: user.learningGoal,
        ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
      },
    }));
  }, [user]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings to storage', e);
    }
  }, [settings]);

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

    // If system theme, listen for OS changes
    if (settings.appearance.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.appearance.theme, settings.display.fontFamily, settings.display.fontSize, settings.display.readingWidth]);

  const updateProfile = (profileUpdate: Partial<UserProfile>) => {
    setSettings((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...profileUpdate },
    }));
    if (user) {
      void updateRemoteProfile({
        ...(profileUpdate.name !== undefined ? { name: profileUpdate.name } : {}),
        ...(profileUpdate.bio !== undefined ? { bio: profileUpdate.bio } : {}),
        ...(profileUpdate.learningGoal !== undefined ? { learningGoal: profileUpdate.learningGoal } : {}),
      });
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
