import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { visit } from 'unist-util-visit';
import type { Element } from 'hast';
import type { Root, Parent } from 'mdast';
import { CodeBlock } from '../components/lesson/CodeBlock';
import 'katex/dist/katex.min.css';

/**
 * Rewrite legacy ./assets/ paths to the bundled /content-assets/ location.
 * (The ==highlight== syntax is handled by remarkHighlight below — no raw HTML needed.)
 */
const preprocessMarkdown = (text: string) => {
  return text.replace(
    /!\[([^\]]*)\]\((?:\.\/assets\/|\/content-assets\/assets\/)([^)]+)\)/g,
    '![$1](/content-assets/$2)'
  );
};

/** Converts ==text== into a <mark> element without ever parsing raw HTML. */
function remarkHighlight() {
  return (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      const parts = node.value.split(/==([^=\n]+)==/g);
      if (parts.length === 1) return;
      const children: Array<Record<string, unknown>> = [];
      for (let i = 0; i < parts.length; i += 1) {
        if (i % 2 === 0) {
          if (parts[i]) children.push({ type: 'text', value: parts[i] });
        } else {
          children.push({
            type: 'highlight',
            data: { hName: 'mark' },
            children: [{ type: 'text', value: parts[i] }],
          });
        }
      }
      (parent as Parent).children.splice(index, 1, ...(children as unknown as Parent['children']));
      return index + children.length;
    });
  };
}

const REMARK_PLUGINS = [remarkGfm, remarkMath, remarkHighlight];
const REHYPE_PLUGINS = [rehypeKatex];

const inlineComponents: Components = {
  p: React.Fragment,
  a: ({ node: _node, ...props }) => (
    <a className="lesson-inline-link" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  code: ({ node: _node, ...props }) => <code className="inline-code-pill" {...props} />,
  mark: ({ node: _node, ...props }) => <mark className="lesson-highlight" {...props} />,
  del: ({ node: _node, ...props }) => <del className="lesson-strike" {...props} />,
};

/**
 * Inline Markdown Renderer (strips wrapping <p> tags).
 * Use this for titles, captions, and short text where a block element would break the layout.
 */
export const MarkdownInline: React.FC<{ content?: string }> = React.memo(({ content }) => {
  if (!content) return null;
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={inlineComponents}
    >
      {preprocessMarkdown(content)}
    </ReactMarkdown>
  );
});
MarkdownInline.displayName = 'MarkdownInline';

/**
 * Legacy compatibility wrapper for renderRichText.
 * Maps all existing renderRichText(text) calls to the new MarkdownInline component.
 */
export function renderRichText(content?: string): React.ReactNode {
  return <MarkdownInline content={content} />;
}

/** Extracts language + source from a fenced ```code``` hast node for CodeBlock rendering. */
function extractFencedCode(preNode?: Element): { code: string; language: string } | null {
  const codeEl = preNode?.children?.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'code'
  );
  if (!codeEl) return null;
  const classNames = codeEl.properties?.className;
  const classList = Array.isArray(classNames) ? classNames.map(String) : [];
  const langClass = classList.find((cls) => cls.startsWith('language-'));
  const textChild = codeEl.children?.find((child) => child.type === 'text');
  const code = textChild && 'value' in textChild ? String(textChild.value) : '';
  if (!code.trim()) return null;
  return { code, language: (langClass?.replace('language-', '') || 'text').toLowerCase() };
}

const blockComponents: Components = {
  p: ({ node: _node, ...props }) => <p className="lesson-paragraph" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="lesson-list" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="lesson-list lesson-ordered-list" {...props} />,
  a: ({ node: _node, ...props }) => (
    <a className="lesson-inline-link" target="_blank" rel="noopener noreferrer" {...props} />
  ),
  code: ({ node: _node, ...props }) => <code className="inline-code-pill" {...props} />,
  blockquote: ({ node: _node, ...props }) => <blockquote className="rich-quote-block" {...props} />,
  mark: ({ node: _node, ...props }) => <mark className="lesson-highlight" {...props} />,
  del: ({ node: _node, ...props }) => <del className="lesson-strike" {...props} />,
  table: ({ node: _node, ...props }) => (
    <div className="table-wrapper"><table className="lesson-table" {...props} /></div>
  ),
  img: ({ node: _node, ...props }) => (
    <img className="lesson-inline-image" loading="lazy" referrerPolicy="no-referrer" {...props} />
  ),
  li: ({ node, children, ...props }) => {
    const classNames = Array.isArray(node?.properties?.className)
      ? node?.properties.className.map(String)
      : [];
    const isTask = classNames.includes('task-list-item');
    return (
      <li className={`lesson-list-item ${isTask ? 'lesson-task-item' : ''}`} {...props}>
        {children}
      </li>
    );
  },
  input: ({ node: _node, checked, ...props }) => (
    <input type="checkbox" className="lesson-task-checkbox" disabled={true} checked={!!checked} readOnly {...props} />
  ),
  section: ({ node, children, ...props }) => {
    // GFM footnotes arrive as <section data-footnotes>
    if (node?.properties && 'dataFootnotes' in node.properties) {
      return <section className="lesson-footnotes" {...props}>{children}</section>;
    }
    return <section {...props}>{children}</section>;
  },
  pre: ({ node, children }) => {
    const fenced = extractFencedCode(node);
    if (fenced) {
      return <CodeBlock code={fenced.code} language={fenced.language} />;
    }
    return <pre>{children}</pre>;
  },
};

/**
 * Block Markdown Renderer.
 * Use this for full paragraphs, lists, and main body text.
 */
export const MarkdownBlock: React.FC<{ content?: string }> = React.memo(({ content }) => {
  if (!content) return null;
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={blockComponents}
    >
      {preprocessMarkdown(content)}
    </ReactMarkdown>
  );
});
MarkdownBlock.displayName = 'MarkdownBlock';
