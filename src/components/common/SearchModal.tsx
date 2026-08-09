import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Course } from '../../types/curriculum';
import { 
  Search01Icon, 
  ArrowRight01Icon,
} from 'hugeicons-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  onSelectTopic: (courseId: string, topicId: string) => void;
  onSelectCourse: (courseId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  courses,
  onSelectTopic,
  onSelectCourse,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { courses: [], topics: [] };

    const matchingCourses = courses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q)) ||
      c.description.toLowerCase().includes(q)
    );

    const matchingTopics = courses.flatMap(c =>
      c.modules.flatMap(m =>
        m.topics
          .filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.summary.toLowerCase().includes(q)
          )
          .map(t => ({
            ...t,
            courseId: c.id,
            courseTitle: c.title,
            category: c.tags[0] || c.level,
          }))
      )
    );

    return { courses: matchingCourses, topics: matchingTopics };
  }, [courses, query]);

  if (!isOpen) return null;

  const handleSelectCourse = (courseId: string) => {
    onSelectCourse(courseId);
    onClose();
  };

  const handleSelectTopic = (courseId: string, topicId: string) => {
    onSelectTopic(courseId, topicId);
    onClose();
  };

  const totalResults = searchResults.courses.length + searchResults.topics.length;

  return (
    <div className="glass-modal-overlay" onClick={onClose}>
      <div className="glass-search-modal" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Box */}
        <div className="glass-search-input-wrap">
          <Search01Icon size={20} className="glass-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="glass-search-input"
            placeholder="Search AI courses, transformer architectures, math, topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Dynamic Results */}
        {query.trim() !== '' && (
          <div className="glass-search-results">
            {totalResults === 0 ? (
              <div className="glass-search-empty">
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              <>
                {/* Courses */}
                {searchResults.courses.length > 0 && (
                  <div className="glass-results-group">
                    <div className="glass-group-title">Courses</div>
                    {searchResults.courses.map((course) => (
                      <div
                        key={course.id}
                        className="glass-result-item"
                        onClick={() => handleSelectCourse(course.id)}
                      >
                        <div className="glass-result-title">{course.title}</div>
                        <div className="glass-result-right">
                          <span className="glass-result-badge">{course.tags[0] || course.level}</span>
                          <ArrowRight01Icon size={14} className="glass-result-arrow" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Topics */}
                {searchResults.topics.length > 0 && (
                  <div className="glass-results-group">
                    <div className="glass-group-title">Lessons & Topics</div>
                    {searchResults.topics.map((topic) => (
                      <div
                        key={topic.id}
                        className="glass-result-item"
                        onClick={() => handleSelectTopic(topic.courseId, topic.id)}
                      >
                        <div className="glass-result-title">{topic.title}</div>
                        <div className="glass-result-right">
                          <span className="glass-result-badge">{topic.category}</span>
                          <ArrowRight01Icon size={14} className="glass-result-arrow" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};



