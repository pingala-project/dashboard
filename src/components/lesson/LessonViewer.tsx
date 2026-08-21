import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Link01Icon,
} from 'hugeicons-react';
import { renderRichText, MarkdownBlock } from '../../utils/formatContent';
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

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'section';
}

interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Derives stable, unique anchor ids for every h2/h3 block, keyed by block index. */
function buildHeadingAnchors(topic: Topic): { entries: TocEntry[]; slugByBlockIndex: Map<number, string> } {
  const seen = new Map<string, number>();
  const entries: TocEntry[] = [];
  const slugByBlockIndex = new Map<number, string>();
  topic.blocks.forEach((block, index) => {
    if (block.type !== 'heading2' && block.type !== 'heading3') return;
    const text = block.text || '';
    let slug = slugify(text);
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    if (count > 0) slug = `${slug}-${count}`;
    slugByBlockIndex.set(index, slug);
    entries.push({ id: slug, text, level: block.type === 'heading2' ? 2 : 3 });
  });
  return { entries, slugByBlockIndex };
}

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
  const articleRef = useRef<HTMLElement>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);

  const activeContributor = topic.contributor || course.contributor || {
    name: 'Pingala Contributors',
    github: 'pingala-project',
  };

  const diffColor = DIFFICULTY_COLOR[topic.difficulty?.toLowerCase() || 'beginner'] || '#22c55e';

  const { entries: tocEntries, slugByBlockIndex } = useMemo(() => buildHeadingAnchors(topic), [topic]);

  // Track which section is in view for the TOC highlight.
  useEffect(() => {
    if (tocEntries.length === 0) return;
    const headingEls = tocEntries
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (headingEls.length === 0) return;

    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed
          .filter((item) => item.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveHeadingId(visible[0].target.id);
        }
      },
      { rootMargin: '-72px 0px -68% 0px', threshold: 0 }
    );
    headingEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tocEntries]);

  // Thin reading-progress bar driven by the lesson's scroll container.
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    // The workspace scrolls in an inner container on lesson pages; fall back to window.
    const scroller = article.closest('.course-workspace-main') as HTMLElement | null;

    const updateProgress = () => {
      if (scroller) {
        const mRect = scroller.getBoundingClientRect();
        const aRect = article.getBoundingClientRect();
        const total = Math.max(aRect.height - mRect.height, 1);
        const scrolled = Math.min(Math.max(mRect.top - aRect.top, 0), total);
        setReadingProgress(scrolled / total);
      } else {
        const start = article.offsetTop;
        const end = start + article.offsetHeight - window.innerHeight;
        setReadingProgress(Math.min(Math.max((window.scrollY - start) / Math.max(end - start, 1), 0), 1));
      }
    };

    updateProgress();
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      target.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [topic.id]);

  const handleAnchorClick = (id: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    const url = `${window.location.pathname}${window.location.search}#${id}`;
    window.history.replaceState(null, '', url);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    void navigator.clipboard?.writeText(`${window.location.origin}${url}`).catch(() => {});
  };

  const handleToggleComplete = () => {
    if (!isCompleted) {
      void import('canvas-confetti')
        .then((module) => {
          if (settings.learning.confettiEnabled) {
            module.default({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          }
        })
        .catch(() => { /* ignore */ });
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

  const renderTocLinks = () =>
    tocEntries.map((entry) => (
      <a
        key={entry.id}
        href={`#${entry.id}`}
        className={`lesson-toc-link lvl-${entry.level} ${activeHeadingId === entry.id ? 'active' : ''}`}
        onClick={(event) => {
          event.preventDefault();
          handleAnchorClick(entry.id)(event);
        }}
      >
        {entry.text}
      </a>
    ));

  return (
    <article className="lesson-article" ref={articleRef}>
      {/* Reading progress */}
      <div className="lesson-progress-track" aria-hidden="true">
        <div className="lesson-progress-fill" style={{ transform: `scaleX(${readingProgress})` }} />
      </div>

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

        {/* Inline TOC for narrow viewports */}
        {tocEntries.length > 2 && (
          <details className="lesson-toc-inline">
            <summary className="lesson-toc-summary">On this page · {tocEntries.length} sections</summary>
            <nav className="lesson-toc-inline-nav">{renderTocLinks()}</nav>
          </details>
        )}

        {/* Main content blocks */}
        <div className="lesson-blocks">
          {topic.blocks.map((block, bIdx) => {
            switch (block.type) {
              case 'paragraph':
                return (
                  <MarkdownBlock key={bIdx} content={block.text} />
                );

              case 'heading2':
              case 'heading3': {
                const anchorId = slugByBlockIndex.get(bIdx);
                const HeadingTag = block.type === 'heading2' ? 'h2' : 'h3';
                return (
                  <HeadingTag
                    key={bIdx}
                    id={anchorId}
                    className={block.type === 'heading2' ? 'lesson-h2' : 'lesson-h3'}
                  >
                    <span className="lesson-heading-text">{renderRichText(block.text)}</span>
                    {anchorId && (
                      <a
                        href={`#${anchorId}`}
                        className="lesson-heading-anchor"
                        onClick={handleAnchorClick(anchorId)}
                        title="Copy link to this section"
                        aria-label="Copy link to this section"
                      >
                        <Link01Icon size={13} />
                      </a>
                    )}
                  </HeadingTag>
                );
              }

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

      {/* Sticky TOC rail for wide viewports */}
      {tocEntries.length > 2 && (
        <nav className="lesson-toc-rail" aria-label="On this page">
          <span className="lesson-toc-rail-label">On this page</span>
          {renderTocLinks()}
        </nav>
      )}
    </article>
  );
};
