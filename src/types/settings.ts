export type ThemeMode = 'light' | 'dark' | 'system';

export type FontFamilyChoice = 'sans' | 'serif' | 'mono' | 'handwritten' | 'atkinson' | 'lexend';

export type FontSizeChoice = 'compact' | 'standard' | 'large';

export type ReadingWidthChoice = 'standard' | 'spacious';

export type CodeThemeChoice = 'onedark' | 'github' | 'monokai';

export interface UserProfile {
  name: string;
  email?: string;
  github: string;
  bio: string;
  avatarUrl?: string;
  learningGoal: string;
}

export interface AppearanceSettings {
  theme: ThemeMode;
  codeTheme: CodeThemeChoice;
}

export interface DisplaySettings {
  fontFamily: FontFamilyChoice;
  fontSize: FontSizeChoice;
  readingWidth: ReadingWidthChoice;
  enableLineNumbers: boolean;
}

export interface LearningSettings {
  confettiEnabled: boolean;
  autoAdvanceOnComplete: boolean;
  instantQuizFeedback: boolean;
  copyCodeWithComments: boolean;
}

export interface AppSettings {
  profile: UserProfile;
  appearance: AppearanceSettings;
  display: DisplaySettings;
  learning: LearningSettings;
  accentColor: string;
}

export type AppSettingsPatch = {
  profile?: Partial<UserProfile>;
  appearance?: Partial<AppearanceSettings>;
  display?: Partial<DisplaySettings>;
  learning?: Partial<LearningSettings>;
  accentColor?: string;
};
