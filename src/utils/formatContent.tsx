import React from 'react';
import katex from 'katex';

const renderKatex = (mathStr: string, displayMode: boolean): string => {
  try {
    return katex.renderToString(mathStr.trim(), {
    displayMode,
    throwOnError: false,
    strict: false,
    trust: false,
    });
  } catch {
    return mathStr;
  }
};

const isSafeHref = (href: string): boolean => /^(https?:\/\/|\/|#)/i.test(href.trim());

/**
 * Renders rich text with support for:
 * - Inline LaTeX: $...$
 * - Bold: **text**
 * - Italic: *text*
 * - Inline code: `code`
 * - Highlights: ==important==
 * - Strikethrough: ~~removed~~
 * - Images: ![alt](https://...)
 * - Links: [title](url)
 */
export function renderRichText(content?: string): React.ReactNode {
  if (!content) return null;

  // We tokenize manually to avoid lookbehind regex issues in Safari/older engines.
  // Supported delimiters (in priority order):
  // 1. $...$  — inline math
  // 2. **..** — bold
  // 3. *...*  — italic  (we handle ** first so we don't mis-match)
  // 4. `...`  — inline code
  // 5. [text](url) — link

  const DELIMITERS = [
    { re: /\$([^$\n]+)\$/, type: 'math' },
    { re: /!\[([^\]]*)\]\(([^)]+)\)/, type: 'image' },
    { re: /\*\*([^*]+)\*\*/, type: 'bold' },
    { re: /==([^=\n]+)==/, type: 'highlight' },
    { re: /~~([^~\n]+)~~/, type: 'strike' },
    { re: /\*([^*]+)\*/, type: 'italic' },
    { re: /`([^`]+)`/, type: 'code' },
    { re: /\[([^\]]+)\]\(([^)]+)\)/, type: 'link' },
  ];

  const nodes: React.ReactNode[] = [];
  let remaining = content;
  let globalIdx = 0;

  while (remaining.length > 0) {
    // Find the earliest matching delimiter
    let earliestIndex = remaining.length;
    let earliestType: string | null = null;
    let earliestMatch: RegExpMatchArray | null = null;

    for (const { re, type } of DELIMITERS) {
      const match = remaining.match(re);
      if (match && match.index !== undefined && match.index < earliestIndex) {
        earliestIndex = match.index;
        earliestType = type;
        earliestMatch = match;
      }
    }

    if (!earliestMatch || earliestType === null) {
      // No more matches — push remaining text
      nodes.push(remaining);
      break;
    }

    // Push plain text before match
    if (earliestIndex > 0) {
      nodes.push(remaining.slice(0, earliestIndex));
    }

    const fullMatch = earliestMatch[0];

    switch (earliestType) {
      case 'math': {
        const html = renderKatex(earliestMatch[1], false);
        nodes.push(
          <span
            key={globalIdx++}
            className="inline-latex-math"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
        break;
      }
      case 'bold':
        nodes.push(<strong key={globalIdx++}>{earliestMatch[1]}</strong>);
        break;
      case 'italic':
        nodes.push(<em key={globalIdx++}>{earliestMatch[1]}</em>);
        break;
      case 'code':
        nodes.push(
          <code key={globalIdx++} className="inline-code-pill">
            {earliestMatch[1]}
          </code>
        );
        break;
      case 'highlight':
        nodes.push(<mark key={globalIdx++} className="lesson-highlight">{earliestMatch[1]}</mark>);
        break;
      case 'strike':
        nodes.push(<del key={globalIdx++} className="lesson-strike">{earliestMatch[1]}</del>);
        break;
      case 'image':
        if (isSafeHref(earliestMatch[2])) {
          nodes.push(
            <img
              key={globalIdx++}
              src={earliestMatch[2]}
              alt={earliestMatch[1] || 'Lesson illustration'}
              className="lesson-inline-image"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          );
        } else {
          nodes.push(earliestMatch[1]);
        }
        break;
      case 'link':
        if (isSafeHref(earliestMatch[2])) {
          nodes.push(
            <a
              key={globalIdx++}
              href={earliestMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="lesson-inline-link"
            >
              {earliestMatch[1]}
            </a>
          );
        } else {
          nodes.push(earliestMatch[1]);
        }
        break;
    }

    remaining = remaining.slice(earliestIndex + fullMatch.length);
  }

  return nodes;
}
