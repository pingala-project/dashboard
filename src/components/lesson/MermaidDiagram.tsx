import React, { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  definition: string;
}

let mermaidModule: Promise<typeof import('mermaid')['default']> | null = null;

function loadMermaid() {
  if (!mermaidModule) {
    mermaidModule = import('mermaid').then((mod) => {
      mod.default.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily:
          "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
      });
      return mod.default;
    });
  }
  return mermaidModule;
}

/** Renders a Mermaid definition to an SVG. Loaded lazily so it stays out of the main bundle. */
export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ definition }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderId = 0;

    void (async () => {
      try {
        const mermaid = await loadMermaid();
        const { svg } = await mermaid.render(`pingala-mermaid-${Date.now()}-${renderId++}`, definition);
        if (!cancelled && containerRef.current) {
          setError(null);
          containerRef.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled) setError('This diagram could not be rendered.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [definition]);

  return (
    <div className="mermaid-diagram">
      {error ? (
        <pre className="mermaid-error">{definition}</pre>
      ) : (
        <div ref={containerRef} className="mermaid-svg-host" />
      )}
    </div>
  );
};
