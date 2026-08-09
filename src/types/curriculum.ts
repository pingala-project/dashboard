export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type CalloutVariant = 'note' | 'tip' | 'warning' | 'deep-dive';

export interface Contributor {
  name: string;
  github: string; // GitHub username/id without @
  role?: string;
  avatarUrl?: string;
}

export interface ContentBlock {
  type: 'paragraph' | 'heading2' | 'heading3' | 'callout' | 'code' | 'math' | 'list' | 'key_takeaways' | 'image' | 'chart' | 'embed' | 'attachment' | 'quote';
  title?: string;
  text?: string;
  items?: string[];
  variant?: CalloutVariant;
  language?: string;
  code?: string;
  math?: string;
  caption?: string;
  src?: string;
  url?: string;
  alt?: string;
  width?: string;
  height?: number;
  description?: string;
  label?: string;
  provider?: string;
}

export interface CheckpointQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Topic {
  id: string;
  title: string;
  slug: string;
  moduleId?: string;
  order?: number;
  moduleTitle: string;
  courseId: string;
  license?: string;
  sources?: string[];
  aiAssisted?: boolean;
  authorAttestation?: boolean;
  legacy?: boolean;
  readingTime: string;
  difficulty: DifficultyLevel;
  summary: string;
  objectives: string[];
  blocks: ContentBlock[];
  checkpoints: CheckpointQuestion[];
  contributor?: Contributor;
  nextTopicId?: string;
  prevTopicId?: string;
}

export interface Module {
  id: string;
  slug?: string;
  order?: number;
  title: string;
  description: string;
  topics: Topic[];
  contributor?: Contributor;
}

export interface CardSnippet {
  previewItems?: {
    id: string;
    title: string;
    subtext: string;
    color: string;
  }[];
  tasks?: {
    id: string;
    text: string;
    done: boolean;
  }[];
  numberedList?: string[];
  dateBadge?: string;
  notesParagraph?: string;
}

export interface ColorTheme {
  border: string;
  bg: string;
  headerBg: string;
  badgeBg: string;
  badgeText: string;
  accent: string;
  tagBg: string;
}

export interface Course {
  id: string;
  order?: number;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  trackId: string;
  level: 'Foundations' | 'Core ML' | 'Deep Learning' | 'LLMs & GenAI' | 'Systems & RL';
  theme: ColorTheme;
  icon: string;
  estimatedHours: string;
  prerequisites: string[];
  tags: string[];
  modules: Module[];
  cardStyle: 'pink-reading' | 'workout-tasks' | 'trip-notes' | 'green-lecture' | 'blue-folder' | 'purple-archive';
  cardSnippet?: CardSnippet;
  contributor?: Contributor;
}

export interface Track {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  courseIds: string[];
}

export type ActiveView = 
  | { type: 'all_courses' }
  | { type: 'track'; trackId: string }
  | { type: 'course'; courseId: string }
  | { type: 'topic'; courseId: string; topicId: string }
  | { type: 'tasks' }
  | { type: 'bookmarks' }
  | { type: 'calendar' }
  | { type: 'settings' };
