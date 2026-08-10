import React from 'react';
import type { Topic, Course } from '../../types/curriculum';
import { MathBlock } from './MathBlock';
import { CodeBlock } from './CodeBlock';
import { Checkpoint } from './Checkpoint';
import { 
  ArrowLeft02Icon, 
  ArrowRight02Icon, 
  CheckmarkCircle02Icon, 
  Clock01Icon, 
  Bookmark02Icon,
  Idea01Icon, 
  Alert02Icon, 
  SparklesIcon,
} from 'hugeicons-react';
import confetti from 'canvas-confetti';
import { renderRichText } from '../../utils/formatContent';
import { useSettings } from '../../context/SettingsContext';
import { RichMediaBlock } from './RichMediaBlock';
import { ReadingNotes } from './ReadingNotes';

interface LessonViewerProps {
  topic: Topic;
  course: Course;
  isCompleted: boolean;
  isBookmarked: boolean;
  onToggleComplete: () => void;
  onToggleBookmark: () => void;
  onNavigateTopic: (topicId: string) => void;
  onBackToCourse: () => void;
  onBackToAll: () => void;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: '#22c55e',
  intermediate: '#eab308',
  advanced: '#ef4444',
};

export const LessonViewer: React.FC<LessonViewerProps> = ({
  topic,
  course,
  isCompleted,
  isBookmarked,
  onToggleComplete,
  onToggleBookmark,
  onNavigateTopic,
  onBackToCourse,
  onBackToAll,
}) => {
  const { settings } = useSettings();
  const activeContributor = topic.contributor || course.contributor || {
    name: 'Pingala Contributors',
    github: 'rishabh',
  };

  const diffColor = DIFFICULTY_COLOR[topic.difficulty?.toLowerCase() || 'beginner'] || '#22c55e';

  const handleToggleComplete = () => {
    if (!isCompleted) {
      try {
        if (settings.learning.confettiEnabled) {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }
      } catch { /* ignore */ }
    }
    onToggleComplete();
    if (!isCompleted && settings.learning.autoAdvanceOnComplete && topic.nextTopicId) {
      window.setTimeout(() => onNavigateTopic(topic.nextTopicId!), 450);
    }
  };

  const renderCalloutIcon = (variant?: string) => {
    switch (variant) {
      case 'tip': return <Idea01Icon size={16} color="#10b981" />;
      case 'warning': return <Alert02Icon size={16} color="#f59e0b" />;
      case 'deep-dive': return <SparklesIcon size={16} color="#818cf8" />;
      default: return <SparklesIcon size={16} color="#818cf8" />;
    }
  };

  return (
    <article className="lesson-article">
      {/* Breadcrumbs */}
      <nav className="lesson-breadcrumbs">
        <span className="lesson-breadcrumb-link" onClick={onBackToAll}>Courses</span>
        <span className="lesson-breadcrumb-sep">/</span>
        <span className="lesson-breadcrumb-link" onClick={onBackToCourse}>{course.title}</span>
        <span className="lesson-breadcrumb-sep">/</span>
        <span className="lesson-breadcrumb-current">{topic.title}</span>
      </nav>

      <div className="lesson-content-column">
        {/* Header */}
        <header className="lesson-header">
          <h1 className="lesson-title">{topic.title}</h1>

          {/* Single meta row */}
          <div className="lesson-meta-row">
            <div className="lesson-meta-left">
              <a
                href={`https://github.com/${activeContributor.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="lesson-author-link"
              >
                @{activeContributor.github}
              </a>
              <span className="lesson-meta-sep">·</span>
              <span className="lesson-meta-item">
                <Clock01Icon size={13} />
                {topic.readingTime}
              </span>
              <span className="lesson-meta-sep">·</span>
              <span className="lesson-meta-difficulty" style={{ color: diffColor }}>
                {topic.difficulty}
              </span>
            </div>

            <div className="lesson-actions">
              <button
                className={`lesson-action-btn ${isBookmarked ? 'active' : ''}`}
                onClick={onToggleBookmark}
                title={isBookmarked ? 'Saved' : 'Save'}
              >
                <Bookmark02Icon size={15} color={isBookmarked ? '#f59e0b' : 'currentColor'} />
                <span>{isBookmarked ? 'Saved' : 'Save'}</span>
              </button>

              <button
                className={`lesson-complete-btn ${isCompleted ? 'completed' : ''}`}
                onClick={handleToggleComplete}
              >
                <CheckmarkCircle02Icon size={15} />
                <span>{isCompleted ? 'Completed' : 'Mark complete'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Lead summary — no box, just styled paragraph */}
        {topic.summary && (
          <p className="lesson-lead-summary">{renderRichText(topic.summary)}</p>
        )}

        <div className="lesson-divider" />

        {/* Objectives */}
        {topic.objectives && topic.objectives.length > 0 && (
          <div className="lesson-objectives-block">
            <span className="lesson-section-label">In this lesson</span>
            <ul className="lesson-objectives-list">
              {topic.objectives.map((obj, i) => (
                <li key={i}>{renderRichText(obj)}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Main content blocks */}
        <div className="lesson-blocks">
          {topic.blocks.map((block, bIdx) => {
            switch (block.type) {
              case 'paragraph':
                return (
                  <p key={bIdx} className="lesson-paragraph">
                    {renderRichText(block.text)}
                  </p>
                );

              case 'heading2':
                return (
                  <h2 key={bIdx} className="lesson-h2">
                    {renderRichText(block.text)}
                  </h2>
                );

              case 'heading3':
                return (
                  <h3 key={bIdx} className="lesson-h3">
                    {renderRichText(block.text)}
                  </h3>
                );

              case 'callout':
                return (
                  <div key={bIdx} className={`lesson-callout callout-${block.variant || 'note'}`}>
                    <div className="callout-icon">{renderCalloutIcon(block.variant)}</div>
                    <div className="callout-body">
                      {block.title && <div className="callout-title">{renderRichText(block.title)}</div>}
                      <div className="callout-text">{renderRichText(block.text)}</div>
                    </div>
                  </div>
                );

              case 'math':
                return (
                  <MathBlock
                    key={bIdx}
                    math={block.math || ''}
                    caption={block.caption}
                  />
                );

              case 'code':
                return (
                  <CodeBlock
                    key={bIdx}
                    language={block.language || 'python'}
                    code={block.code || ''}
                  />
                );

              case 'list':
                return (
                  <ul key={bIdx} className="lesson-list">
                    {block.items?.map((item, iIdx) => (
                      <li key={iIdx}>{renderRichText(item)}</li>
                    ))}
                  </ul>
                );

              case 'key_takeaways':
                return (
                  <div key={bIdx} className="lesson-takeaways">
                    <span className="lesson-section-label">Key takeaways</span>
                    <ul className="lesson-takeaways-list">
                      {block.items?.map((item, iIdx) => (
                        <li key={iIdx}>{renderRichText(item)}</li>
                      ))}
                    </ul>
                  </div>
                );

              case 'image':
              case 'chart':
              case 'embed':
              case 'attachment':
              case 'quote':
                return <RichMediaBlock key={bIdx} block={block} />;

              default:
                return null;
            }
          })}
        </div>

        {/* Quiz checkpoints */}
        <div className="lesson-checkpoint-section">
          <Checkpoint checkpoints={topic.checkpoints} />
        </div>

        <ReadingNotes topicId={topic.id} />

        {/* Bottom navigation */}
        <nav className="lesson-bottom-nav">
          {topic.prevTopicId ? (
            <button
              className="lesson-nav-btn prev"
              onClick={() => onNavigateTopic(topic.prevTopicId!)}
            >
              <ArrowLeft02Icon size={15} />
              <span>Previous</span>
            </button>
          ) : (
            <button className="lesson-nav-btn prev" onClick={onBackToCourse}>
              <ArrowLeft02Icon size={15} />
              <span>Course overview</span>
            </button>
          )}

          {topic.nextTopicId ? (
            <button
              className="lesson-nav-btn next"
              onClick={() => onNavigateTopic(topic.nextTopicId!)}
            >
              <span>Next lesson</span>
              <ArrowRight02Icon size={15} />
            </button>
          ) : (
            <button
              className="lesson-nav-btn next complete"
              onClick={handleToggleComplete}
            >
              <span>Complete lesson</span>
              <CheckmarkCircle02Icon size={15} />
            </button>
          )}
        </nav>
      </div>
    </article>
  );
};
