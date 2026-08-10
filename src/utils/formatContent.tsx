import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

/**
 * Preprocess markdown to support legacy Pingala syntax in standard markdown.
 * 1. Convert ==highlight== to <mark> tags.
 * 2. Rewrite ./assets/ to /content-assets/ for inline images.
 */
const preprocessMarkdown = (text: string) => {
  return text
    .replace(/==([^=\n]+)==/g, '<mark>$1</mark>')
    // Handle both ./assets/ and /content-assets/assets/ paths in raw markdown
    .replace(/!\[([^\]]*)\]\((?:\.\/assets\/|\/content-assets\/assets\/)([^)]+)\)/g, '![$1](/content-assets/$2)');
};

/**
 * Inline Markdown Renderer (strips wrapping <p> tags).
 * Use this for titles, captions, and short text where a block element would break the layout.
 */
export const MarkdownInline: React.FC<{ content?: string }> = ({ content }) => {
  if (!content) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeRaw]}
      components={{
        p: React.Fragment,
        a: ({ node, ...props }) => <a className="lesson-inline-link" target="_blank" rel="noopener noreferrer" {...props} />,
        code: ({ node, ...props }) => <code className="inline-code-pill" {...props} />,
        mark: ({ node, ...props }) => <mark className="lesson-highlight" {...props} />,
        del: ({ node, ...props }) => <del className="lesson-strike" {...props} />,
      }}
    >
      {preprocessMarkdown(content)}
    </ReactMarkdown>
  );
};

/**
 * Legacy compatibility wrapper for renderRichText.
 * Maps all existing renderRichText(text) calls to the new MarkdownInline component.
 */
export function renderRichText(content?: string): React.ReactNode {
  return <MarkdownInline content={content} />;
}

/**
 * Block Markdown Renderer.
 * Use this for full paragraphs, lists, and main body text.
 */
export const MarkdownBlock: React.FC<{ content?: string }> = ({ content }) => {
  if (!content) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeRaw]}
      components={{
        p: ({ node, ...props }) => <p className="lesson-paragraph" {...props} />,
        ul: ({ node, ...props }) => <ul className="lesson-list" {...props} />,
        ol: ({ node, ...props }) => <ol className="lesson-list" {...props} />,
        a: ({ node, ...props }) => <a className="lesson-inline-link" target="_blank" rel="noopener noreferrer" {...props} />,
        code: ({ node, ...props }) => <code className="inline-code-pill" {...props} />,
        blockquote: ({ node, ...props }) => <blockquote className="rich-quote-block" {...props} />,
        mark: ({ node, ...props }) => <mark className="lesson-highlight" {...props} />,
        del: ({ node, ...props }) => <del className="lesson-strike" {...props} />,
        table: ({ node, ...props }) => <div className="table-wrapper"><table className="lesson-table" {...props} /></div>,
        img: ({ node, ...props }) => <img className="lesson-inline-image" loading="lazy" referrerPolicy="no-referrer" {...props} />,
      }}
    >
      {preprocessMarkdown(content)}
    </ReactMarkdown>
  );
};
