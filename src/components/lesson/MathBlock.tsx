import React, { useMemo } from 'react';
import katex from 'katex';

interface MathBlockProps {
  math: string;
  caption?: string;
}

export const MathBlock: React.FC<MathBlockProps> = ({ math, caption }) => {
  const html = useMemo(() => {
    try {
      // Clean leading/trailing single/double dollars or backslashes if already present
      let cleanMath = math.trim();
      if (cleanMath.startsWith('$$') && cleanMath.endsWith('$$')) {
        cleanMath = cleanMath.slice(2, -2).trim();
      } else if (cleanMath.startsWith('$') && cleanMath.endsWith('$')) {
        cleanMath = cleanMath.slice(1, -1).trim();
      }

      return katex.renderToString(cleanMath, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
    } catch (e) {
      console.error('KaTeX rendering error:', e);
      return `<span class="katex-error">${math}</span>`;
    }
  }, [math]);

  return (
    <div className="math-block-container">
      <div 
        className="math-formula-rendered"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
      {caption && <div className="math-caption">{caption}</div>}
    </div>
  );
};
