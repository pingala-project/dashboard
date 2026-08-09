import React, { useState } from 'react';
import type { Course } from '../../types/curriculum';
import { CourseIcon } from './CourseIcon';
import { Clock01Icon, CheckmarkCircle02Icon, ArrowDown01Icon } from 'hugeicons-react';

interface CourseDetailProps {
  course: Course;
  completedTopicIds?: Set<string>;
  onSelectTopic: (topicId: string) => void;
  onBackToAll?: () => void;
  onToggleCompleteTopic?: (topicId: string, e: React.MouseEvent) => void;
}

export const CourseDetail: React.FC<CourseDetailProps> = ({
  course,
  completedTopicIds = new Set(),
  onSelectTopic,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'lessons' | 'overview'>('lessons');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    // Expand first module by default
    const first = course.modules[0]?.id;
    return first ? new Set([first]) : new Set();
  });

  const toggleModule = (modId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId);
      else next.add(modId);
      return next;
    });
  };

  const allTopics = course.modules.flatMap(m => m.topics);
  const completedCount = allTopics.filter(t => completedTopicIds.has(t.id)).length;
  const firstTopic = allTopics[0];

  const activeContributor = course.contributor || { name: 'Pingala Contributors', github: 'rishabh' };

  return (
    <div className="course-detail-page">
      {/* ── Course Header ─────────────────────────────────────────────── */}
      <div className="course-detail-header">
        <div className="course-detail-icon">
          <CourseIcon courseId={course.id} size={40} />
        </div>

        <h1 className="course-detail-title">{course.title}</h1>
        <p className="course-detail-tagline">{course.tagline}</p>

        {/* Meta row: hours + progress */}
        <div className="course-detail-meta-row">
          <span className="course-meta-item">
            <Clock01Icon size={14} />
            {course.estimatedHours}
          </span>
          <span className="course-meta-dot">·</span>
          <span className="course-meta-item">
            {course.modules.length} modules
          </span>
          <span className="course-meta-dot">·</span>
          <span className="course-meta-item">
            {allTopics.length} lessons
          </span>
          {completedCount > 0 && (
            <>
              <span className="course-meta-dot">·</span>
              <span className="course-meta-item course-meta-progress">
                <CheckmarkCircle02Icon size={14} color="#22c55e" />
                {completedCount}/{allTopics.length} done
              </span>
            </>
          )}
        </div>

        {/* Actions + Contributor single line */}
        <div className="mobbin-app-actions-row single-line-actions">
          <div className="actions-left-group">
            <button
              className={`mobbin-action-pill-btn save ${isSaved ? 'saved' : ''}`}
              onClick={() => setIsSaved(!isSaved)}
            >
              {isSaved ? 'Saved' : 'Save'}
            </button>

            {firstTopic && (
              <button
                className="mobbin-action-pill-btn rate"
                onClick={() => onSelectTopic(firstTopic.id)}
              >
                Start Course
              </button>
            )}

            <div className="mobbin-more-wrapper">
              <button
                className="mobbin-action-pill-btn more"
                onClick={() => setShowMoreMenu(v => !v)}
              >
                ···
              </button>
              {showMoreMenu && (
                <div className="mobbin-more-popover">
                  <div
                    className="mobbin-popover-item"
                    onClick={() => { navigator.clipboard.writeText(window.location.href); setShowMoreMenu(false); }}
                  >
                    Copy link
                  </div>
                </div>
              )}
            </div>
          </div>

          <a
            href={`https://github.com/${activeContributor.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mobbin-contributor-link"
          >
            <span className="contributor-label-text">Contributor</span>
            <span className="contributor-github-badge">@{activeContributor.github}</span>
          </a>
        </div>

        {/* Tab bar */}
        <div className="mobbin-app-subnav-bar clean-tabs-bar">
          <div className="subnav-tabs-group">
            <button
              className={`subnav-tab-item ${activeTab === 'lessons' ? 'active' : ''}`}
              onClick={() => setActiveTab('lessons')}
            >
              Lessons
            </button>
            <button
              className={`subnav-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
          </div>
        </div>
      </div>

      {/* ── Content: Module / Topic List ──────────────────────────────── */}
      {activeTab === 'lessons' && (
        <div className="course-modules-list">
          {course.modules.map((mod, mIdx) => {
            const cleanTitle = mod.title.replace(/^Module \d+:\s*/i, '');
            const isExpanded = expandedModules.has(mod.id);
            const modCompletedCount = mod.topics.filter(t => completedTopicIds.has(t.id)).length;

            return (
              <div key={mod.id} className="course-module-block">
                {/* Module header */}
                <button
                  className="course-module-header"
                  onClick={() => toggleModule(mod.id)}
                >
                  <div className="module-header-left">
                    <span className="module-number">
                      {String(mIdx + 1).padStart(2, '0')}
                    </span>
                    <div className="module-header-text">
                      <span className="module-title">{cleanTitle}</span>
                      <span className="module-meta">
                        {mod.topics.length} lessons
                        {modCompletedCount > 0 && ` · ${modCompletedCount}/${mod.topics.length} done`}
                      </span>
                    </div>
                  </div>
                  <ArrowDown01Icon
                    size={16}
                    className={`module-chevron ${isExpanded ? 'expanded' : ''}`}
                  />
                </button>

                {/* Topic rows */}
                {isExpanded && (
                  <div className="course-topics-list">
                    {mod.topics.map((topic, tIdx) => {
                      const isDone = completedTopicIds.has(topic.id);
                      return (
                        <button
                          key={topic.id}
                          className={`course-topic-row ${isDone ? 'done' : ''}`}
                          onClick={() => onSelectTopic(topic.id)}
                        >
                          <div className="topic-row-left">
                            <span className={`topic-index-dot ${isDone ? 'done' : ''}`}>
                              {isDone
                                ? <CheckmarkCircle02Icon size={16} color="#22c55e" />
                                : <span className="topic-num">{tIdx + 1}</span>
                              }
                            </span>
                            <div className="topic-row-text">
                              <span className="topic-title">{topic.title}</span>
                              {topic.summary && (
                                <span className="topic-summary">{topic.summary}</span>
                              )}
                            </div>
                          </div>
                          <div className="topic-row-right">
                            {topic.readingTime && (
                              <span className="topic-read-time">{topic.readingTime}</span>
                            )}
                            {topic.difficulty && (
                              <span className={`topic-difficulty-badge ${topic.difficulty.toLowerCase()}`}>
                                {topic.difficulty}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="course-overview-section">
          <p className="course-overview-description">{course.description}</p>

          {course.prerequisites && course.prerequisites.length > 0 && (
            <div className="course-overview-block">
              <h3 className="course-overview-heading">Prerequisites</h3>
              <ul className="course-overview-list">
                {course.prerequisites.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {course.tags && course.tags.length > 0 && (
            <div className="course-overview-block">
              <h3 className="course-overview-heading">Topics covered</h3>
              <div className="course-tag-group">
                {course.tags.map(tag => (
                  <span key={tag} className="course-tag-pill">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
