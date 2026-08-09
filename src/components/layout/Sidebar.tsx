import React, { useState, useMemo, useEffect } from 'react';
import { 
  Folder01Icon, 
  Task01Icon, 
  Bookmark02Icon,
  SidebarLeftIcon,
  ArrowLeft01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Search01Icon,
  Tick02Icon,
} from 'hugeicons-react';
import type { ActiveView, Course } from '../../types/curriculum';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  completedTopicIds: Set<string>;
  bookmarkedTopicIds: Set<string>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  courses: Course[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  completedTopicIds,
  bookmarkedTopicIds,
  isCollapsed,
  onToggleCollapse,
  courses,
}) => {
  // Determine if we are in course / topic view
  const isCourseContext = activeView.type === 'course' || activeView.type === 'topic';
  const activeCourseId = isCourseContext ? activeView.courseId : null;
  const activeCourse = activeCourseId ? courses.find((c) => c.id === activeCourseId) : null;
  const activeTopicId = activeView.type === 'topic' ? activeView.topicId : null;

  // Search state for sidebar tree filter
  const [searchQuery, setSearchQuery] = useState('');

  // Expanded state tracking
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(() => new Set());
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(() => new Set());

  // Initialize expanded modules on course change or topic select
  useEffect(() => {
    if (activeCourse) {
      // Expand all modules by default for easy tree browsing
      setExpandedModuleIds(new Set(activeCourse.modules.map((m) => m.id)));
    }
  }, [activeCourse]);

  // Ensure active topic is always expanded
  useEffect(() => {
    if (activeTopicId) {
      setExpandedTopicIds((prev) => {
        const next = new Set(prev);
        next.add(activeTopicId);
        return next;
      });
    }
  }, [activeTopicId]);

  const toggleModule = (modId: string) => {
    setExpandedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) {
        next.delete(modId);
      } else {
        next.add(modId);
      }
      return next;
    });
  };

  const toggleTopic = (topicId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  // Handler to scroll to subtopic heading in LessonViewer
  const handleScrollToHeading = (headingId: string) => {
    const el = document.getElementById(headingId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filter modules/topics/subtopics when searching
  const filteredModules = useMemo(() => {
    if (!activeCourse) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeCourse.modules;

    return activeCourse.modules
      .map((module) => {
        const moduleMatch = module.title.toLowerCase().includes(query);
        const matchingTopics = module.topics.filter((topic) => {
          const topicMatch = topic.title.toLowerCase().includes(query) || (topic.summary && topic.summary.toLowerCase().includes(query));
          const blockMatch = topic.blocks.some((b) => b.text && b.text.toLowerCase().includes(query));
          return topicMatch || blockMatch;
        });

        if (moduleMatch || matchingTopics.length > 0) {
          return {
            ...module,
            topics: moduleMatch ? module.topics : matchingTopics,
          };
        }
        return null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [activeCourse, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  if (isCollapsed) return null;

  return (
    <aside className="sidebar">
      {/* 1. SIDEBAR IN COURSE / CHAPTER CONTEXT (Nested Tree Style) */}
      {isCourseContext && activeCourse ? (
        <div className="sidebar-course-mode">
          {/* Top Search Input */}
          <div className="sidebar-tree-search-bar">
            <Search01Icon size={14} className="tree-search-icon" />
            <input 
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tree-search-input"
            />
          </div>

          {/* Header Row: Course Title + Back and Collapse Controls */}
          <div className="sidebar-tree-header-row">
            <div className="sidebar-tree-title-group">
              <button 
                className="sidebar-tree-back-icon-btn" 
                onClick={() => onNavigate({ type: 'all_courses' })}
                title="Back to all courses"
              >
                <ArrowLeft01Icon size={15} />
              </button>
              <h2 
                className="sidebar-tree-course-title"
                onClick={() => onNavigate({ type: 'course', courseId: activeCourse.id })}
                title={activeCourse.title}
              >
                {activeCourse.title}
              </h2>
            </div>

            <button 
              className="sidebar-toggle-btn" 
              onClick={onToggleCollapse}
              title="Collapse Sidebar"
            >
              <SidebarLeftIcon size={16} />
            </button>
          </div>

          {/* Collapsible Nested Hierarchy */}
          <div className="sidebar-tree-scroll">
            {filteredModules.length === 0 ? (
              <div className="sidebar-tree-empty">No matching chapters</div>
            ) : (
              filteredModules.map((module) => {
                const isModExpanded = isSearching || expandedModuleIds.has(module.id);
                const hasTopics = module.topics.length > 0;

                return (
                  <div key={module.id} className="sidebar-tree-module-group">
                    {/* Level 1: Module / Category */}
                    <button
                      className={`sidebar-tree-item level-1 ${isModExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleModule(module.id)}
                    >
                      <span className="tree-item-label">
                        {module.title.replace(/^Module \d+:\s*/i, '')}
                      </span>
                      {hasTopics && (
                        <span className="tree-chevron-wrap">
                          {isModExpanded ? <ArrowUp01Icon size={13} /> : <ArrowDown01Icon size={13} />}
                        </span>
                      )}
                    </button>

                    {/* Level 2: Topics */}
                    {isModExpanded && (
                      <div className="sidebar-tree-topics-container">
                        {module.topics.map((topic) => {
                          const isTopicActive = activeTopicId === topic.id;
                          const subtopics = topic.blocks
                            .map((b, idx) => {
                              if (b.type === 'heading2' || b.type === 'heading3') {
                                return { id: `heading-${idx}`, title: b.text || '' };
                              }
                              return null;
                            })
                            .filter((item): item is { id: string; title: string } => item !== null);

                          const hasSubtopics = subtopics.length > 0 || (topic.checkpoints && topic.checkpoints.length > 0);
                          const isTopicExpanded = isSearching || expandedTopicIds.has(topic.id) || isTopicActive;

                          return (
                            <div key={topic.id} className="sidebar-tree-topic-group">
                              <div
                                className={`sidebar-tree-item level-2 ${isTopicActive ? 'active' : ''}`}
                                onClick={() => {
                                  onNavigate({ type: 'topic', courseId: activeCourse.id, topicId: topic.id });
                                  if (hasSubtopics) {
                                    toggleTopic(topic.id);
                                  }
                                }}
                              >
                                <span className="tree-item-label">{topic.title}</span>
                                {hasSubtopics && (
                                  <span 
                                    className="tree-chevron-wrap"
                                    onClick={(e) => toggleTopic(topic.id, e)}
                                  >
                                    {isTopicExpanded ? <ArrowUp01Icon size={12} /> : <ArrowDown01Icon size={12} />}
                                  </span>
                                )}
                              </div>

                              {/* Level 3: Subtopics / In-Page Outline */}
                              {isTopicExpanded && hasSubtopics && (
                                <div className="sidebar-tree-subtopics-container">
                                  {subtopics.map((sub) => (
                                    <button
                                      key={sub.id}
                                      className="sidebar-tree-item level-3"
                                      onClick={() => {
                                        if (!isTopicActive) {
                                          onNavigate({ type: 'topic', courseId: activeCourse.id, topicId: topic.id });
                                          setTimeout(() => handleScrollToHeading(sub.id), 120);
                                        } else {
                                          handleScrollToHeading(sub.id);
                                        }
                                      }}
                                    >
                                      <span className="tree-item-label">{sub.title}</span>
                                    </button>
                                  ))}

                                  {topic.checkpoints && topic.checkpoints.length > 0 && (
                                    <button
                                      className="sidebar-tree-item level-3 knowledge-check"
                                      onClick={() => {
                                        if (!isTopicActive) {
                                          onNavigate({ type: 'topic', courseId: activeCourse.id, topicId: topic.id });
                                          setTimeout(() => handleScrollToHeading('checkpoint-quiz-section'), 120);
                                        } else {
                                          handleScrollToHeading('checkpoint-quiz-section');
                                        }
                                      }}
                                    >
                                      <span className="tree-item-label">Knowledge Check ({topic.checkpoints.length})</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* 2. SIDEBAR IN GLOBAL VIEW (Courses, Todo, Saved) */
        <div className="sidebar-global-mode">
          {/* Header: Brand Name + Collapse Button */}
          <div className="sidebar-header">
            <div className="sidebar-brand-title">
              <span className="brand-logo-text">Pingala</span>
            </div>
            <button 
              className="sidebar-toggle-btn" 
              onClick={onToggleCollapse}
              title="Collapse Sidebar"
            >
              <SidebarLeftIcon size={18} />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="sidebar-scroll">
            <div className="nav-section">
              <button 
                className={`nav-item ${activeView.type === 'all_courses' ? 'active' : ''}`}
                onClick={() => onNavigate({ type: 'all_courses' })}
              >
                <div className="nav-item-left">
                  <Folder01Icon size={18} className="nav-item-icon" />
                  <span className="nav-item-title">Courses</span>
                </div>
                <span className="nav-item-badge">{courses.length}</span>
              </button>

              <button 
                className={`nav-item ${activeView.type === 'tasks' ? 'active' : ''}`}
                onClick={() => onNavigate({ type: 'tasks' })}
              >
                <div className="nav-item-left">
                  <Task01Icon size={18} className="nav-item-icon" />
                  <span className="nav-item-title">Todo</span>
                </div>
                {completedTopicIds.size > 0 && (
                  <span className="nav-item-badge completed-badge">
                    <Tick02Icon size={11} />
                    {completedTopicIds.size}
                  </span>
                )}
              </button>

              <button 
                className={`nav-item ${activeView.type === 'bookmarks' ? 'active' : ''}`}
                onClick={() => onNavigate({ type: 'bookmarks' })}
              >
                <div className="nav-item-left">
                  <Bookmark02Icon size={18} className="nav-item-icon" />
                  <span className="nav-item-title">Saved</span>
                </div>
                {bookmarkedTopicIds.size > 0 && (
                  <span className="nav-item-badge">{bookmarkedTopicIds.size}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
