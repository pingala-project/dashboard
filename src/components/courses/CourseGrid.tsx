import React, { useState, useMemo } from 'react';
import type { Course } from '../../types/curriculum';
import { CourseCard } from './CourseCard';
import { 
  CheckmarkCircle02Icon
} from 'hugeicons-react';

interface CourseGridProps {
  courses: Course[];
  completedTopicIds: Set<string>;
  onSelectCourse: (courseId: string) => void;
}

type TabFilter = 'aiml' | 'mathematics';

export const CourseGrid: React.FC<CourseGridProps> = ({
  courses,
  completedTopicIds,
  onSelectCourse,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<TabFilter>('aiml');

  // Filter courses according to active subject tab
  const filteredCourses = useMemo(() => {
    switch (activeTab) {
      case 'mathematics':
        return courses.filter((c) => 
          c.id === 'math-ai' || 
          c.tags.some((t) => 
            t.toLowerCase().includes('calculus') || 
            t.toLowerCase().includes('algebra') || 
            t.toLowerCase().includes('math')
          )
        );
      case 'aiml':
      default:
        return courses.filter((c) => c.id !== 'math-ai');
    }
  }, [courses, activeTab]);

  return (
    <div className="mobbin-courses-section">
      {/* Mobbin Control Bar: Grid/List Pill + Subject Switcher */}
      <div className="mobbin-filter-bar">
        {/* Left: Grid / List Pill Toggle */}
        <div className="mobbin-view-pill">
          <button 
            className={`mobbin-pill-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <span>Grid</span>
          </button>
          <button 
            className={`mobbin-pill-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <span>List</span>
          </button>
        </div>

        {/* Separator Line between Toggle and Switch Buttons */}
        <div className="mobbin-filter-separator" />

        {/* Center: Subjects Tabs (AIML, Mathematics) */}
        <div className="mobbin-tabs-nav">
          <button 
            className={`mobbin-tab-btn ${activeTab === 'aiml' ? 'active' : ''}`}
            onClick={() => setActiveTab('aiml')}
          >
            <span>AIML</span>
            {activeTab === 'aiml' && <div className="tab-active-indicator" />}
          </button>

          <button 
            className={`mobbin-tab-btn ${activeTab === 'mathematics' ? 'active' : ''}`}
            onClick={() => setActiveTab('mathematics')}
          >
            <span>Mathematics</span>
            {activeTab === 'mathematics' && <div className="tab-active-indicator" />}
          </button>
        </div>
      </div>

      {/* Course Cards Container */}
      {viewMode === 'grid' ? (
        <div className="mobbin-courses-grid">
          {filteredCourses.map((course) => {
            const allTopics = course.modules.flatMap((m) => m.topics);
            const completedForCourse = allTopics.filter((t) => completedTopicIds.has(t.id)).length;

            return (
              <CourseCard
                key={course.id}
                course={course}
                completedCount={completedForCourse}
                totalTopicsCount={allTopics.length}
                onClick={() => onSelectCourse(course.id)}
              />
            );
          })}
        </div>
      ) : (
        /* Mobbin Connected Stepper Timeline List View */
        <div className="mobbin-stepper-list">
          {filteredCourses.map((course, idx) => {
            const allTopics = course.modules.flatMap((m) => m.topics);
            const completedCount = allTopics.filter((t) => completedTopicIds.has(t.id)).length;
            const isCompleted = allTopics.length > 0 && completedCount === allTopics.length;

            return (
              <div 
                key={course.id} 
                className="mobbin-step-item"
                onClick={() => onSelectCourse(course.id)}
              >
                {/* Left Column: Numbered Badge + Seamless Connector Line */}
                <div className="mobbin-step-left-col">
                  <div className={`mobbin-step-connector ${idx === 0 ? 'first' : ''} ${idx === filteredCourses.length - 1 ? 'last' : ''}`} />
                  <div className={`mobbin-step-number ${isCompleted ? 'completed' : ''}`}>
                    {isCompleted ? <CheckmarkCircle02Icon size={14} color="#FFFFFF" /> : idx + 1}
                  </div>
                </div>

                {/* Right Body: Title, Subtitle, and Meta */}
                <div className="mobbin-step-body">
                  <h3 className="mobbin-step-title">{course.title}</h3>
                  <p className="mobbin-step-description">{course.tagline || course.description}</p>
                  <div className="mobbin-step-meta">
                    <span>{course.level}</span>
                    <span>·</span>
                    <span>{course.estimatedHours}</span>
                    <span>·</span>
                    <span>{allTopics.length} lessons</span>
                    {completedCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="mobbin-step-progress-text">
                          {Math.round((completedCount / allTopics.length) * 100)}% done
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
