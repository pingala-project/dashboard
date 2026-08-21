import React, { useState, useMemo, Suspense, lazy } from 'react';
import { Copy01Icon, CheckmarkCircle02Icon } from 'hugeicons-react';
import Prism from 'prismjs';
import { useSettings } from '../../context/SettingsContext';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-sql';

const MermaidDiagram = lazy(() =>
  import('./MermaidDiagram').then((m) => ({ default: m.MermaidDiagram }))
);

interface CodeBlockProps {
  code: string;
  language?: string;
}

/**
 * Splits Prism's highlighted HTML into lines while keeping multi-line tokens
 * (docstrings, block comments, template literals) intact: any <span> still open
 * at a newline is re-opened at the start of the next line and closed at its end.
 */
export function splitHighlightedLines(html: string): string[] {
  const lines: string[] = [];
  let current = '';
  const openTags: string[] = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] === '\n') {
      lines.push(current);
      current = openTags.join('');
      i += 1;
      continue;
    }
    if (html.startsWith('<span', i)) {
      const end = html.indexOf('>', i);
      if (end === -1) {
        current += html.slice(i);
        break;
      }
      const tag = html.slice(i, end + 1);
      openTags.push(tag);
      current += tag;
      i = end + 1;
      continue;
    }
    if (html.startsWith('</span>', i)) {
      openTags.pop();
      current += '</span>';
      i += '</span>'.length;
      continue;
    }
    if (html[i] === '<') {
      const end = html.indexOf('>', i);
      if (end !== -1) {
        current += html.slice(i, end + 1);
        i = end + 1;
        continue;
      }
    }
    current += html[i];
    i += 1;
  }
  lines.push(current);
  return lines;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'python' }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const { settings } = useSettings();

  const cleanLang = (language || 'python').toLowerCase().trim();

  const highlightedHtml = useMemo(() => {
    try {
      const grammar = Prism.languages[cleanLang] || Prism.languages.python || Prism.languages.javascript;
      if (grammar) {
        return Prism.highlight(code, grammar, cleanLang);
      }
      return code;
    } catch {
      return code;
    }
  }, [code, cleanLang]);

  const highlightLines = useMemo(
    () => (cleanLang === 'mermaid' ? [] : splitHighlightedLines(highlightedHtml)),
    [highlightedHtml, cleanLang]
  );

  const handleCopy = async () => {
    try {
      const copyText = settings.learning.copyCodeWithComments
        ? code
        : code.split('\n').filter((line) => !/^\s*(#|\/\/|--)/.test(line)).join('\n');
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="code-lang-label">{cleanLang.toUpperCase()}</span>
        <button className="code-copy-btn" onClick={handleCopy} title="Copy code">
          {copied ? (
            <>
              <CheckmarkCircle02Icon size={14} color="#4ADE80" />
              <span style={{ color: '#4ADE80' }}>Copied!</span>
            </>
          ) : (
            <>
              <Copy01Icon size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {cleanLang === 'mermaid' ? (
        <div className="code-block-body code-mermaid-body">
          <Suspense fallback={<div className="code-mermaid-loading">Rendering diagram…</div>}>
            <MermaidDiagram definition={code} />
          </Suspense>
        </div>
      ) : (
        <pre className={`code-block-body language-${cleanLang} ${settings.display.enableLineNumbers ? 'has-line-numbers' : ''}`}>
          <code className={`language-${cleanLang}`}>
            {highlightLines.map((line, index) => (
              <span className="code-line" key={index} dangerouslySetInnerHTML={{ __html: line || ' ' }} />
            ))}
          </code>
        </pre>
      )}
    </div>
  );
};
