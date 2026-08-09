import React, { useState, useEffect } from 'react';
import { COURSES_DATA } from './data/coursesData';
import type { ActiveView, Course, Topic } from './types/curriculum';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TopBar } from './components/layout/TopBar';
import { CourseGrid } from './components/courses/CourseGrid';
import { CourseDetail } from './components/courses/CourseDetail';
import { LessonViewer } from './components/lesson/LessonViewer';
import { NestedCourseSidebar } from './components/layout/NestedCourseSidebar';
import { SearchModal } from './components/common/SearchModal';
import { SettingsPage } from './components/profile/SettingsPage';
import { Bookmark02Icon } from 'hugeicons-react';
import { ToastProvider, useToast } from './context/ToastContext';

const COMPLETED_STORAGE_KEY = 'pingala_completed_topics';
const BOOKMARKS_STORAGE_KEY = 'pingala_bookmarked_topics';

const AppContent: React.FC = () => {
  const { user, refreshProgress, syncProgress } = useAuth();
  const { showToast } = useToast();
  const [history, setHistory] = useState<ActiveView[]>([{ type: 'all_courses' }]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);

  // Completed topics
  const [completedTopicIds, setCompletedTopicIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(COMPLETED_STORAGE_KEY);
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load completed topics', e);
    }
    return new Set(['topic-vector-spaces']);
  });

  // Bookmarked topics
  const [bookmarkedTopicIds, setBookmarkedTopicIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load bookmarks', e);
    }
    return new Set(['topic-self-attention']);
  });
  const [remoteProgressHydrated, setRemoteProgressHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setRemoteProgressHydrated(false);
      return () => { active = false; };
    }

    void (async () => {
      const remote = await refreshProgress();
      if (!active) return;
      if (remote) {
        setCompletedTopicIds((current) => new Set([...current, ...remote.completedTopicIds]));
        setBookmarkedTopicIds((current) => new Set([...current, ...remote.bookmarkedTopicIds]));
      }
      setRemoteProgressHydrated(true);
    })();

    return () => { active = false; };
  }, [refreshProgress, user]);

  useEffect(() => {
    if (!user || !remoteProgressHydrated) return;
    void syncProgress({
      completedTopicIds: Array.from(completedTopicIds),
      bookmarkedTopicIds: Array.from(bookmarkedTopicIds),
    });
  }, [bookmarkedTopicIds, completedTopicIds, remoteProgressHydrated, syncProgress, user]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(Array.from(completedTopicIds)));
    } catch (e) {
      console.error('Failed to save completed topics', e);
    }
  }, [completedTopicIds]);

  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(bookmarkedTopicIds)));
    } catch (e) {
      console.error('Failed to save bookmarks', e);
    }
  }, [bookmarkedTopicIds]);

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

  const activeView = history[historyIndex] || { type: 'all_courses' };

  const navigateTo = (newView: ActiveView) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newView);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setIsProfileDropdownOpen(false);
  };

  const handleToggleComplete = (topicId: string) => {
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
    setCompletedTopicIds(new Set());
    setBookmarkedTopicIds(new Set());
    showToast('Progress reset', 'Completed lessons and bookmarks were cleared.', 'success');
  };

  const handleExportData = () => {
    const exportObject = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      completedTopicIds: Array.from(completedTopicIds),
      bookmarkedTopicIds: Array.from(bookmarkedTopicIds),
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
        showToast('Backup imported', 'Your curriculum progress and bookmarks were restored.', 'success');
      } catch {
        showToast('Import failed', 'Choose a valid Pingala JSON backup file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Total topics calculation
  const allCurriculumTopics = COURSES_DATA.flatMap((c) => c.modules.flatMap((m) => m.topics));

  // Find active course & topic
  let currentCourse: Course | undefined;
  let currentTopic: Topic | undefined;

  if (activeView.type === 'course') {
    currentCourse = COURSES_DATA.find((c) => c.id === activeView.courseId);
  } else if (activeView.type === 'topic') {
    currentCourse = COURSES_DATA.find((c) => c.id === activeView.courseId);
    if (currentCourse) {
      for (const m of currentCourse.modules) {
        const found = m.topics.find((t) => t.id === activeView.topicId);
        if (found) {
          currentTopic = found;
          break;
        }
      }
    }
  }

  // Render main view content
  const renderMainContent = () => {
    switch (activeView.type) {
      case 'all_courses':
        return (
          <div className="mobbin-catalog-container">
            <CourseGrid
              courses={COURSES_DATA}
              completedTopicIds={completedTopicIds}
              onSelectCourse={(courseId) => navigateTo({ type: 'course', courseId })}
            />
          </div>
        );

      case 'course':
      case 'topic': {
        if (!currentCourse) return <div className="state-not-found">Course not found</div>;

        return (
          <div className="course-workspace-layout">
            <NestedCourseSidebar
              course={currentCourse}
              activeTopicId={activeView.type === 'topic' ? activeView.topicId : undefined}
              completedTopicIds={completedTopicIds}
              onSelectTopic={(topicId) => 
                navigateTo({ type: 'topic', courseId: currentCourse!.id, topicId })
              }
              onSelectCourseHome={() => 
                navigateTo({ type: 'course', courseId: currentCourse!.id })
              }
            />

            <div className="course-workspace-main">
              {activeView.type === 'course' ? (
                <CourseDetail
                  course={currentCourse}
                  completedTopicIds={completedTopicIds}
                  onSelectTopic={(topicId) => 
                    navigateTo({ type: 'topic', courseId: currentCourse!.id, topicId })
                  }
                  onBackToAll={() => navigateTo({ type: 'all_courses' })}
                  onToggleCompleteTopic={(topicId, e) => {
                    e.stopPropagation();
                    handleToggleComplete(topicId);
                  }}
                />
              ) : (
                currentTopic && (
                  <LessonViewer
                    topic={currentTopic}
                    course={currentCourse}
                    isCompleted={completedTopicIds.has(currentTopic.id)}
                    isBookmarked={bookmarkedTopicIds.has(currentTopic.id)}
                    onToggleComplete={() => handleToggleComplete(currentTopic!.id)}
                    onToggleBookmark={() => handleToggleBookmark(currentTopic!.id)}
                    onNavigateTopic={(topicId) => 
                      navigateTo({ type: 'topic', courseId: currentCourse!.id, topicId })
                    }
                    onBackToCourse={() => navigateTo({ type: 'course', courseId: currentCourse!.id })}
                    onBackToAll={() => navigateTo({ type: 'all_courses' })}
                  />
                )
              )}
            </div>
          </div>
        );
      }

      case 'bookmarks': {
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
                    onClick={() => navigateTo({ type: 'topic', courseId: item.courseId, topicId: item.id })}
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
                <button 
                  className="saved-empty-explore-btn"
                  onClick={() => navigateTo({ type: 'all_courses' })}
                >
                  Explore courses
                </button>
              </div>
            )}
          </div>
        );
      }

      case 'settings':
        return (
          <SettingsPage
            completedTopicsCount={completedTopicIds.size}
            bookmarkedTopicsCount={bookmarkedTopicIds.size}
            totalTopicsCount={allCurriculumTopics.length}
            onResetProgress={handleResetProgress}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onBack={() => navigateTo({ type: 'all_courses' })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="mobbin-app-layout">
      {/* Mobbin Top Bar */}
      <TopBar
        activeViewType={activeView.type}
        onNavigateTab={(tab) => navigateTo({ type: tab })}
        onOpenSearch={() => setIsSearchOpen(true)}
        onToggleProfileDropdown={() => setIsProfileDropdownOpen((prev) => !prev)}
        isProfileDropdownOpen={isProfileDropdownOpen}
        onCloseProfileDropdown={() => setIsProfileDropdownOpen(false)}
        onOpenSettings={() => navigateTo({ type: 'settings' })}
        bookmarkedCount={bookmarkedTopicIds.size}
      />

      {/* Main Full-Width Content Body */}
      <main className="mobbin-main-body">
        {renderMainContent()}
      </main>

      {/* Quick Search Modal (Cmd+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        courses={COURSES_DATA}
        onSelectTopic={(courseId, topicId) => {
          navigateTo({ type: 'topic', courseId, topicId });
        }}
        onSelectCourse={(courseId) => {
          navigateTo({ type: 'course', courseId });
        }}
      />

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
