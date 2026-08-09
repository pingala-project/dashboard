import React, { useState, useMemo } from 'react';
import type { Course } from '../../types/curriculum';
import { Search01Icon } from 'hugeicons-react';

interface NestedCourseSidebarProps {
  course: Course;
  activeTopicId?: string;
  completedTopicIds?: Set<string>;
  onSelectTopic: (topicId: string) => void;
  onSelectCourseHome: () => void;
}

export const NestedCourseSidebar: React.FC<NestedCourseSidebarProps> = ({
  course,
  activeTopicId,
  onSelectTopic,
  onSelectCourseHome,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  const toggleModule = (id: string) => {
    setCollapsedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  const isHomeActive = !activeTopicId;

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
        {/* Category Heading (Only bold white header) */}
        <div className="tree-category-heading">Curriculum</div>
        
        {/* Overview / Home Item */}
        <div 
          className={`sidebar-nav-item root-item ${isHomeActive ? 'active' : ''}`}
          onClick={onSelectCourseHome}
        >
          <span className="item-text">Overview</span>
        </div>

        {/* Real Course Modules & Topics */}
        {filteredModules.map((mod, mIdx) => {
          const modKey = `mod-${mod.id || mIdx}`;
          const isCollapsed = !!collapsedModules[modKey] && !searchQuery;
          const cleanModTitle = mod.title.replace(/^Module \d+:\s*/i, '');

          return (
            <div key={modKey} className="sidebar-module-block">
              {/* Module Header with Chevron */}
              <div 
                className="sidebar-nav-item module-header-item"
                onClick={() => toggleModule(modKey)}
              >
                <span className="item-text">{cleanModTitle}</span>
                <span className="item-chevron">{isCollapsed ? '⌄' : '⌃'}</span>
              </div>

              {/* Module Topics (Uniform text size & spacing) */}
              {!isCollapsed && (
                <div className="sidebar-topic-list">
                  {mod.topics.map((topic) => {
                    const isActive = topic.id === activeTopicId;
                    return (
                      <div
                        key={topic.id}
                        className={`sidebar-nav-item topic-item ${isActive ? 'active' : ''}`}
                        onClick={() => onSelectTopic(topic.id)}
                        title={topic.title}
                      >
                        <span className="item-text">{topic.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
