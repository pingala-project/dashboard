import React, { useState, useMemo } from 'react';
import type { Course } from '../../types/curriculum';
import { Search01Icon } from 'hugeicons-react';
import { CurriculumList } from '../courses/CurriculumList';

interface NestedCourseSidebarProps {
  course: Course;
  activeTopicId?: string;
  completedTopicIds?: Set<string>;
  onSelectTopic: (topicId: string) => void;
}

export const NestedCourseSidebar: React.FC<NestedCourseSidebarProps> = ({
  course,
  activeTopicId,
  onSelectTopic,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return course.modules;

    return course.modules
      .map((mod) => {
        const matchingTopics = mod.topics.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.summary?.toLowerCase().includes(query) ||
            mod.title.toLowerCase().includes(query)
        );

        if (matchingTopics.length > 0) {
          return { ...mod, topics: matchingTopics };
        }
        return null;
      })
      .filter(Boolean) as typeof course.modules;
  }, [course.modules, searchQuery]);

  return (
    <aside className="image1-nested-sidebar">
      {/* Search Bar at Top */}
      <div className="sidebar-search-container">
        <div className="sidebar-search-box">
          <Search01Icon size={15} className="sidebar-search-icon" />
          <input
            type="text"
            className="sidebar-search-field"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Navigation Tree Content */}
      <div className="sidebar-tree-body">
        <CurriculumList modules={filteredModules} compact activeTopicId={activeTopicId} onSelectTopic={onSelectTopic} />
      </div>
    </aside>
  );
};
