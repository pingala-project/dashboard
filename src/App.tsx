import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { COURSES_DATA } from './data/coursesData';
import type { Course, Topic } from './types/curriculum';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TopBar } from './components/layout/TopBar';
import { CourseGrid } from './components/courses/CourseGrid';
import { CourseDetail } from './components/courses/CourseDetail';
import { LessonViewer } from './components/lesson/LessonViewer';
import { NestedCourseSidebar } from './components/layout/NestedCourseSidebar';
import { NotFoundPage } from './components/common/NotFoundPage';
import { Bookmark02Icon } from 'hugeicons-react';
import { ToastProvider, useToast } from './context/ToastContext';
import { ScrollToTop, usePageTitle } from './utils/pageMeta';
import { coursePath, homePath, savedPath, settingsPath, topicPath } from './utils/paths';

const SearchModal = lazy(() =>
  import('./components/common/SearchModal').then((m) => ({ default: m.SearchModal }))
);
const SettingsPage = lazy(() =>
  import('./components/profile/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

const COMPLETED_STORAGE_KEY = 'pingala_completed_topics';
const BOOKMARKS_STORAGE_KEY = 'pingala_bookmarked_topics';

const AUTH_ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  oauth_cancelled: {
    title: 'GitHub login cancelled',
    message: 'No changes were made. You can try again whenever you are ready.',
  },
  oauth_denied: {
    title: 'GitHub did not approve login',
    message: 'Approve the requested GitHub profile access, then try again.',
  },
  invalid_state: {
    title: 'Login session could not be verified',
    message: 'Start login again in this tab. If it repeats, allow cookies for Pingala and GitHub.',
  },
  expired_state: {
    title: 'Login session expired',
    message: 'GitHub login must be completed within ten minutes. Please try again.',
  },
  token_exchange: {
    title: 'GitHub login could not be completed',
    message: 'The OAuth app credentials or callback URL need attention. Please try again shortly.',
  },
  bad_verification_code: {
    title: 'GitHub login code expired',
    message: 'Start a fresh GitHub login from Pingala.',
  },
  github_profile: {
    title: 'GitHub profile could not be loaded',
    message: 'Check that the OAuth app has read:user and user:email access, then try again.',
  },
  not_configured: {
    title: 'GitHub login is not ready',
    message: 'The production OAuth configuration is incomplete.',
  },
  database: {
    title: 'Sign-in data is not ready',
    message: 'The production D1 migration has not finished yet. Please try again after deployment.',
  },
  server_error: {
    title: 'Sign-in service needs attention',
    message: 'The server could not finish login. Please try again after the latest migration is deployed.',
  },
};

function readLegacyIds(key: string) {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? new Set(parsed.filter((id): id is string => typeof id === 'string')) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function findTopic(courseId: string | undefined, topicId: string | undefined): { course?: Course; topic?: Topic } {
  if (!courseId || !topicId) return {};
  const course = COURSES_DATA.find((c) => c.id === courseId);
  if (!course) return {};
  for (const m of course.modules) {
    const found = m.topics.find((t) => t.id === topicId);
    if (found) return { course, topic: found };
  }
  return { course };
}

function findCourseIdForTopic(topicId: string): string | undefined {
  for (const c of COURSES_DATA) {
    if (c.modules.some((m) => m.topics.some((t) => t.id === topicId))) return c.id;
  }
  return undefined;
}

const HomePage: React.FC<{ completedTopicIds: Set<string>; onSelectCourse: (courseId: string) => void }> = ({
  completedTopicIds,
  onSelectCourse,
}) => {
  usePageTitle();
  return (
    <div className="mobbin-catalog-container">
      <CourseGrid courses={COURSES_DATA} completedTopicIds={completedTopicIds} onSelectCourse={onSelectCourse} />
    </div>
  );
};

const CoursePage: React.FC<{
  completedTopicIds: Set<string>;
  onToggleComplete: (topicId: string) => void;
  onSelectTopic: (courseId: string, topicId: string) => void;
  onBackToAll: () => void;
}> = ({ completedTopicIds, onToggleComplete, onSelectTopic, onBackToAll }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const course = COURSES_DATA.find((c) => c.id === courseId);
  usePageTitle(course ? course.title : 'Course not found');

  if (!course) {
    return <NotFoundPage onNavigateHome={onBackToAll} />;
  }

  return (
    <div className="course-workspace-layout">
      <NestedCourseSidebar
        course={course}
        completedTopicIds={completedTopicIds}
        onSelectTopic={(topicId) => onSelectTopic(course.id, topicId)}
      />
      <div className="course-workspace-main">
        <CourseDetail
          course={course}
          completedTopicIds={completedTopicIds}
          onSelectTopic={(topicId) => onSelectTopic(course.id, topicId)}
          onBackToAll={onBackToAll}
          onToggleCompleteTopic={(topicId, e) => {
            e.stopPropagation();
            onToggleComplete(topicId);
          }}
        />
      </div>
    </div>
  );
};

const TopicPage: React.FC<{
  completedTopicIds: Set<string>;
  bookmarkedTopicIds: Set<string>;
  onToggleComplete: (topicId: string) => void;
  onToggleBookmark: (topicId: string) => void;
  onSelectTopic: (courseId: string, topicId: string) => void;
  onBackToAll: () => void;
}> = ({ completedTopicIds, bookmarkedTopicIds, onToggleComplete, onToggleBookmark, onSelectTopic, onBackToAll }) => {
  const navigate = useNavigate();
  const { courseId, topicId } = useParams<{ courseId: string; topicId: string }>();
  const { course, topic } = findTopic(courseId, topicId);
  usePageTitle(topic && course ? `${topic.title} · ${course.title}` : 'Lesson not found');

  if (!course || !topic) {
    return <NotFoundPage onNavigateHome={onBackToAll} />;
  }

  return (
    <div className="course-workspace-layout">
      <NestedCourseSidebar
        course={course}
        activeTopicId={topic.id}
        completedTopicIds={completedTopicIds}
        onSelectTopic={(id) => onSelectTopic(course.id, id)}
      />
      <div className="course-workspace-main">
        <LessonViewer
          topic={topic}
          course={course}
          isCompleted={completedTopicIds.has(topic.id)}
          isBookmarked={bookmarkedTopicIds.has(topic.id)}
          onToggleComplete={() => onToggleComplete(topic.id)}
          onToggleBookmark={() => onToggleBookmark(topic.id)}
          onNavigateTopic={(nextId) => onSelectTopic(course.id, nextId)}
          onBackToCourse={() => navigate(coursePath(course.id))}
          onBackToAll={onBackToAll}
        />
      </div>
    </div>
  );
};

const SavedPage: React.FC<{
  bookmarkedTopicIds: Set<string>;
  onSelectTopic: (courseId: string, topicId: string) => void;
  onBackToAll: () => void;
}> = ({ bookmarkedTopicIds, onSelectTopic, onBackToAll }) => {
  usePageTitle('Saved Lessons');
  const allTopics = COURSES_DATA.flatMap((c) =>
    c.modules.flatMap((m) => m.topics.map((t) => ({ ...t, courseTitle: c.title, courseId: c.id })))
  );
  const bookmarkedList = allTopics.filter((t) => bookmarkedTopicIds.has(t.id));

  return (
    <div className="mobbin-courses-section">
      <div className="saved-header-editorial">
        <h1 className="saved-title">Saved Lessons</h1>
      </div>

      {bookmarkedList.length > 0 ? (
        <div className="mobbin-courses-grid">
          {bookmarkedList.map((item) => (
            <div
              key={item.id}
              className="course-card"
              onClick={() => onSelectTopic(item.courseId, item.id)}
              role="button"
              tabIndex={0}
            >
              <div className="card-track-label" style={{ color: '#6366f1' }}>
                {item.courseTitle}
              </div>

              <div className="card-header-row">
                <Bookmark02Icon size={20} color="#F59F00" className="card-header-icon" />
                <h3 className="card-title">{item.title}</h3>
              </div>

              <p className="card-description">{item.summary}</p>

              <div className="card-footer">
                <div className="card-meta-pills">
                  <span className="card-meta-pill">{item.difficulty}</span>
                  <span className="card-meta-dot">·</span>
                  <span className="card-meta-pill">{item.readingTime}</span>
                  <span className="card-meta-dot">·</span>
                  <span className="card-meta-pill">{item.moduleTitle}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="saved-empty-state-editorial">
          <Bookmark02Icon size={32} color="var(--text-muted)" />
          <h3 className="saved-empty-title">No saved lessons yet</h3>
          <p className="saved-empty-desc">
            Bookmark lessons while exploring courses to build your personal learning library.
          </p>
          <button className="saved-empty-explore-btn" onClick={onBackToAll}>
            Explore courses
          </button>
        </div>
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isLoading: isAuthLoading, login, refreshProgress, syncProgress, refreshNotes, createNote } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);

  // Completed topics
  const [completedTopicIds, setCompletedTopicIds] = useState<Set<string>>(new Set());

  // Bookmarked topics
  const [bookmarkedTopicIds, setBookmarkedTopicIds] = useState<Set<string>>(new Set());
  const [remoteProgressHydrated, setRemoteProgressHydrated] = useState(false);
  const [legacyProgressPending, setLegacyProgressPending] = useState(false);
  const handledAuthError = useRef<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('auth_error');
    if (!code || handledAuthError.current === code) return;
    handledAuthError.current = code;
    const feedback = AUTH_ERROR_MESSAGES[code] || {
      title: 'GitHub login could not be completed',
      message: 'Please start a fresh login from Pingala.',
    };
    showToast(feedback.title, feedback.message, 'error');
    url.searchParams.delete('auth_error');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [showToast]);

  useEffect(() => {
    let active = true;
    if (isAuthLoading) return () => { active = false; };
    if (!user) {
      setRemoteProgressHydrated(false);
      setLegacyProgressPending(false);
      setCompletedTopicIds(new Set());
      setBookmarkedTopicIds(new Set());
      return () => { active = false; };
    }

    void (async () => {
      const remote = await refreshProgress();
      if (!active) return;
      const legacyCompleted = readLegacyIds(COMPLETED_STORAGE_KEY);
      const legacyBookmarked = readLegacyIds(BOOKMARKS_STORAGE_KEY);
      if (remote) {
        setCompletedTopicIds(new Set([...legacyCompleted, ...remote.completedTopicIds]));
        setBookmarkedTopicIds(new Set([...legacyBookmarked, ...remote.bookmarkedTopicIds]));
      } else {
        setCompletedTopicIds(legacyCompleted);
        setBookmarkedTopicIds(legacyBookmarked);
      }
      setLegacyProgressPending(legacyCompleted.size > 0 || legacyBookmarked.size > 0);
      setRemoteProgressHydrated(true);
    })();

    return () => { active = false; };
  }, [isAuthLoading, refreshProgress, user]);

  useEffect(() => {
    if (!user || !remoteProgressHydrated) return;
    void syncProgress({
      completedTopicIds: Array.from(completedTopicIds),
      bookmarkedTopicIds: Array.from(bookmarkedTopicIds),
    }).then((synced) => {
      if (synced && legacyProgressPending) {
        localStorage.removeItem(COMPLETED_STORAGE_KEY);
        localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
        setLegacyProgressPending(false);
      }
    });
  }, [bookmarkedTopicIds, completedTopicIds, legacyProgressPending, remoteProgressHydrated, syncProgress, user]);

  // Global Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleComplete = (topicId: string) => {
    if (!user) {
      showToast('Log in to track progress', 'Your completed lessons are saved to your GitHub account.', 'info');
      login();
      return;
    }
    setCompletedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const handleToggleBookmark = (topicId: string) => {
    if (!user) {
      showToast('Log in to save lessons', 'Bookmarks follow your account across devices.', 'info');
      login();
      return;
    }
    setBookmarkedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  // Data export/import & reset handlers
  const handleResetProgress = () => {
    if (!user) {
      showToast('Log in to manage your data', 'Progress and bookmarks belong to your account.', 'info');
      login();
      return;
    }
    setCompletedTopicIds(new Set());
    setBookmarkedTopicIds(new Set());
    showToast('Progress reset', 'Completed lessons and bookmarks were cleared.', 'success');
  };

  const handleExportData = async () => {
    if (!user) {
      showToast('Log in to export data', 'Your saved learning data is available after login.', 'info');
      login();
      return;
    }
    const exportObject = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      completedTopicIds: Array.from(completedTopicIds),
      bookmarkedTopicIds: Array.from(bookmarkedTopicIds),
      notes: await refreshNotes(''),
    };
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pingala_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exported', 'Your Pingala progress file is ready.', 'success');
  };

  const handleImportData = (file: File) => {
    if (!user) {
      showToast('Log in to import data', 'Your saved learning data is available after login.', 'info');
      login();
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.completedTopicIds && Array.isArray(parsed.completedTopicIds)) {
          setCompletedTopicIds(new Set(parsed.completedTopicIds));
        }
        if (parsed.bookmarkedTopicIds && Array.isArray(parsed.bookmarkedTopicIds)) {
          setBookmarkedTopicIds(new Set(parsed.bookmarkedTopicIds));
        }
        if (Array.isArray(parsed.notes)) {
          void Promise.all(parsed.notes.slice(0, 200).map((note: unknown) => {
            if (!note || typeof note !== 'object') return null;
            const candidate = note as Record<string, unknown>;
            if (typeof candidate.topicId !== 'string' || typeof candidate.sourceText !== 'string') return null;
            const style = ['plain', 'highlight', 'circle', 'strike'].includes(String(candidate.style)) ? candidate.style as 'plain' | 'highlight' | 'circle' | 'strike' : 'plain';
            return createNote({ topicId: candidate.topicId, sourceText: candidate.sourceText, noteText: typeof candidate.noteText === 'string' ? candidate.noteText : '', style });
          }));
        }
        showToast('Backup imported', 'Your curriculum progress, bookmarks, and notes were restored.', 'success');
      } catch {
        showToast('Import failed', 'Choose a valid Pingala JSON backup file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Total topics calculation
  const allCurriculumTopics = COURSES_DATA.flatMap((c) => c.modules.flatMap((m) => m.topics));

  const goHome = () => navigate(homePath);
  const selectCourse = (courseId: string) => navigate(coursePath(courseId));
  const selectTopic = (courseId: string, topicId: string) => {
    // Resolve the topic's actual course so cross-course prev/next navigation gets correct URLs
    const resolvedCourseId = findCourseIdForTopic(topicId) ?? courseId;
    navigate(topicPath(resolvedCourseId, topicId));
  };

  const handleNavigateTab = (tab: 'all_courses' | 'bookmarks') => {
    if (tab === 'bookmarks' && !user) {
      showToast('Log in to view saved lessons', 'Bookmarks follow your account across devices.', 'info');
      login();
      return;
    }
    setIsProfileDropdownOpen(false);
    if (tab === 'all_courses') goHome();
    else navigate(savedPath);
  };

  const activeSection =
    location.pathname === savedPath
      ? 'saved'
      : location.pathname.startsWith(settingsPath)
        ? 'settings'
        : 'courses';

  return (
    <div className="mobbin-app-layout">
      {/* Mobbin Top Bar */}
      <TopBar
        activeSection={activeSection}
        onNavigateTab={handleNavigateTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onToggleProfileDropdown={() => setIsProfileDropdownOpen((prev) => !prev)}
        isProfileDropdownOpen={isProfileDropdownOpen}
        onCloseProfileDropdown={() => setIsProfileDropdownOpen(false)}
        onOpenSettings={() => navigate(settingsPath)}
        bookmarkedCount={bookmarkedTopicIds.size}
      />

      {/* Main Full-Width Content Body */}
      <main className="mobbin-main-body">
        <Routes>
          <Route path="/" element={<HomePage completedTopicIds={completedTopicIds} onSelectCourse={selectCourse} />} />
          <Route
            path="/saved"
            element={
              <SavedPage bookmarkedTopicIds={bookmarkedTopicIds} onSelectTopic={selectTopic} onBackToAll={goHome} />
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={null}>
                <SettingsPage
                  completedTopicsCount={completedTopicIds.size}
                  bookmarkedTopicsCount={bookmarkedTopicIds.size}
                  totalTopicsCount={allCurriculumTopics.length}
                  onResetProgress={handleResetProgress}
                  onExportData={handleExportData}
                  onImportData={handleImportData}
                  onBack={goHome}
                />
              </Suspense>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <CoursePage
                completedTopicIds={completedTopicIds}
                onToggleComplete={handleToggleComplete}
                onSelectTopic={selectTopic}
                onBackToAll={goHome}
              />
            }
          />
          <Route
            path="/courses/:courseId/topics/:topicId"
            element={
              <TopicPage
                completedTopicIds={completedTopicIds}
                bookmarkedTopicIds={bookmarkedTopicIds}
                onToggleComplete={handleToggleComplete}
                onToggleBookmark={handleToggleBookmark}
                onSelectTopic={selectTopic}
                onBackToAll={goHome}
              />
            }
          />
          <Route path="*" element={<NotFoundPage onNavigateHome={goHome} />} />
        </Routes>
      </main>

      {/* Quick Search Modal (Cmd+K) */}
      <Suspense fallback={null}>
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          courses={COURSES_DATA}
          onSelectTopic={selectTopic}
          onSelectCourse={selectCourse}
        />
      </Suspense>

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AppContent />
          </BrowserRouter>
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
