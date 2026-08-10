import React, { useState } from 'react';
import type { Module } from '../../types/curriculum';
import { ArrowDown01Icon, CheckmarkCircle02Icon } from 'hugeicons-react';

interface CurriculumListProps {
  modules: Module[];
  completedTopicIds?: Set<string>;
  activeTopicId?: string;
  compact?: boolean;
  onSelectTopic: (topicId: string) => void;
}

export const CurriculumList: React.FC<CurriculumListProps> = ({
  modules,
  completedTopicIds = new Set(),
  activeTopicId,
  compact = false,
  onSelectTopic,
}) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => new Set(modules.map((module) => module.id)));

  const toggleModule = (moduleId: string) => {
    setExpandedModules((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  return (
    <div className={`curriculum-list ${compact ? 'curriculum-list-compact' : 'curriculum-list-detail'}`}>
      {modules.map((module, moduleIndex) => {
        const cleanTitle = module.title.replace(/^Module \d+:\s*/i, '');
        const isExpanded = expandedModules.has(module.id);
        const completedCount = module.topics.filter((topic) => completedTopicIds.has(topic.id)).length;
        return (
          <section className="curriculum-module" key={module.id}>
            <button className="course-module-header curriculum-shared-module-header" onClick={() => toggleModule(module.id)} aria-expanded={isExpanded}>
              <div className="module-header-left">
                {!compact && <span className="module-number">{String(moduleIndex + 1).padStart(2, '0')}</span>}
                <div className="module-header-text">
                  <span className="module-title">{cleanTitle}</span>
                  <span className="module-meta">
                    {module.topics.length} {module.topics.length === 1 ? 'lesson' : 'lessons'}
                    {completedCount > 0 && ` · ${completedCount}/${module.topics.length} done`}
                  </span>
                </div>
              </div>
              <ArrowDown01Icon size={16} className={`module-chevron ${isExpanded ? 'expanded' : ''}`} />
            </button>

            {isExpanded && (
              <div className="course-topics-list curriculum-shared-topic-list">
                {module.topics.map((topic, topicIndex) => {
                  const isDone = completedTopicIds.has(topic.id);
                  const isActive = topic.id === activeTopicId;
                  return (
                    <button
                      key={topic.id}
                      className={`course-topic-row curriculum-shared-topic-row ${compact ? 'compact' : ''} ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                      onClick={() => onSelectTopic(topic.id)}
                    >
                      <div className="topic-row-left">
                        <span className={`topic-index-dot ${isDone ? 'done' : ''}`}>
                          {isDone ? <CheckmarkCircle02Icon size={16} color="#22c55e" /> : <span className="topic-num">{topicIndex + 1}</span>}
                        </span>
                        <div className="topic-row-text">
                          <span className="topic-title">{topic.title}</span>
                          {!compact && topic.summary && <span className="topic-summary">{topic.summary}</span>}
                        </div>
                      </div>
                      {!compact && (
                        <div className="topic-row-right">
                          <span className="topic-read-time">{topic.readingTime}</span>
                          <span className={`topic-difficulty-badge ${topic.difficulty.toLowerCase()}`}>{topic.difficulty}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
