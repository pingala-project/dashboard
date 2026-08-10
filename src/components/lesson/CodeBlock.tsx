import React, { useState, useMemo } from 'react';
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

interface CodeBlockProps {
  code: string;
  language?: string;
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
      <pre className={`code-block-body language-${cleanLang} ${settings.display.enableLineNumbers ? 'has-line-numbers' : ''}`}>
        <code className={`language-${cleanLang}`}>
          {highlightedHtml.split('\n').map((line, index) => (
            <span className="code-line" key={`${index}-${line.slice(0, 12)}`} dangerouslySetInnerHTML={{ __html: line || ' ' }} />
          ))}
        </code>
      </pre>
    </div>
  );
};
