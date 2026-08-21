import React, { useState } from 'react';
import type { Course } from '../../types/curriculum';
import { CourseIcon } from './CourseIcon';
import { CurriculumList } from './CurriculumList';
import { Link01Icon } from 'hugeicons-react';
import { useToast } from '../../context/ToastContext';

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
  const { showToast } = useToast();
  const allTopics = course.modules.flatMap(m => m.topics);
  const firstTopic = allTopics[0];

  const activeContributor = course.contributor || { name: 'Pingala Contributors', github: 'pingala-project' };

  return (
    <div className="course-detail-page">
      {/* ── Course Header ─────────────────────────────────────────────── */}
      <div className="course-detail-header">
        <div className="course-detail-icon">
          <CourseIcon courseId={course.id} size={40} />
        </div>

        <h1 className="course-detail-title">{course.title}</h1>
        <p className="course-detail-tagline">{course.tagline}</p>

        {/* Meta Info Grid */}
        <div className="course-detail-meta-grid">
          <div className="meta-grid-column">
            <span className="meta-grid-label">Time</span>
            <span className="meta-grid-value">{course.estimatedHours}</span>
          </div>
          <div className="meta-grid-column">
            <span className="meta-grid-label">Modules</span>
            <span className="meta-grid-value">{course.modules.length}</span>
          </div>
          <div className="meta-grid-column">
            <span className="meta-grid-label">Lessons</span>
            <span className="meta-grid-value">{allTopics.length}</span>
          </div>
          <div className="meta-grid-column">
            <span className="meta-grid-label">Contributor</span>
            <a 
              href={`https://github.com/${activeContributor.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="meta-grid-value contributor-link"
            >
              @{activeContributor.github}
            </a>
          </div>
        </div>

        {/* Actions single line */}
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
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Link copied', 'Course link copied to clipboard.', 'success');
                }}
              >
                <Link01Icon size={16} />
              </button>
            </div>
          </div>
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
          <CurriculumList modules={course.modules} completedTopicIds={completedTopicIds} onSelectTopic={onSelectTopic} />
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
