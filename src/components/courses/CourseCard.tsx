import React from 'react';
import type { Course } from '../../types/curriculum';
import { CourseIcon } from './CourseIcon';

interface CourseCardProps {
  course: Course;
  completedCount: number;
  totalTopicsCount: number;
  onClick: () => void;
}

const TRACK_LABELS: Record<string, string> = {
  foundations: 'Foundations',
  'core-ml': 'Machine Learning',
  'deep-learning': 'Deep Learning',
  'llms-genai': 'LLMs & GenAI',
  'agents-systems': 'AI Agents & Systems',
};

const LEVEL_COLOR: Record<string, string> = {
  foundations: '#6366f1',
  'core-ml': '#f59e0b',
  'deep-learning': '#10b981',
  'llms-genai': '#3b82f6',
  'agents-systems': '#8b5cf6',
};

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  completedCount,
  totalTopicsCount,
  onClick,
}) => {
  const percent = totalTopicsCount > 0 ? Math.round((completedCount / totalTopicsCount) * 100) : 0;
  const trackLabel = TRACK_LABELS[course.trackId] || course.level;
  const accentColor = LEVEL_COLOR[course.trackId] || '#6366f1';

  return (
    <div className="course-card" onClick={onClick} role="button" tabIndex={0}>
      {/* Track label — small grey caps at top */}
      <div className="card-track-label" style={{ color: accentColor }}>
        {trackLabel}
      </div>

      {/* Icon + Title */}
      <div className="card-header-row">
        <CourseIcon courseId={course.id} size={22} className="card-header-icon" />
        <h3 className="card-title">{course.title}</h3>
      </div>

      {/* Description */}
      <p className="card-description">{course.description}</p>

      {/* Footer: meta + progress */}
      <div className="card-footer">
        <div className="card-meta-pills">
          <span className="card-meta-pill">{course.level}</span>
          <span className="card-meta-dot">·</span>
          <span className="card-meta-pill">{course.estimatedHours}</span>
          <span className="card-meta-dot">·</span>
          <span className="card-meta-pill">{totalTopicsCount} lessons</span>
        </div>

        {percent > 0 && (
          <div className="card-progress-row">
            <div className="card-progress-bar-track">
              <div
                className="card-progress-bar-fill"
                style={{ width: `${percent}%`, backgroundColor: accentColor }}
              />
            </div>
            <span className="card-progress-label">{percent}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
