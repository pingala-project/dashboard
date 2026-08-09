import React from 'react';
import { LinkSquare02Icon } from 'hugeicons-react';
import type { ContentBlock } from '../../types/curriculum';
import { renderRichText } from '../../utils/formatContent';

const EMBED_HOSTS = new Set([
  'www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtu.be',
  'player.vimeo.com', 'vimeo.com', 'www.desmos.com', 'desmos.com',
  'observablehq.com', 'www.observablehq.com', 'codepen.io', 'codesandbox.io', 'stackblitz.com',
]);

function safeUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.protocol === 'http:' && url.origin !== window.location.origin) return null;
    return url;
  } catch {
    return null;
  }
}

export const RichMediaBlock: React.FC<{ block: ContentBlock }> = ({ block }) => {
  if (block.type === 'quote') {
    return (
      <blockquote className="rich-quote-block">
        {block.text && renderRichText(block.text)}
        {block.caption && <cite>{renderRichText(block.caption)}</cite>}
      </blockquote>
    );
  }

  const source = safeUrl(block.src || block.url);
  if (!source) return null;

  if (block.type === 'image' || block.type === 'chart') {
    return (
      <figure className={`rich-media-figure rich-media-${block.type}`}>
        <img
          src={source.toString()}
          alt={block.alt || block.caption || 'Lesson illustration'}
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ width: block.width || undefined }}
        />
        {block.caption && <figcaption>{renderRichText(block.caption)}</figcaption>}
      </figure>
    );
  }

  if (block.type === 'embed') {
    const allowed = source.protocol === 'https:' && EMBED_HOSTS.has(source.hostname);
    return (
      <div className="rich-embed-block">
        {allowed ? (
          <iframe
            src={source.toString()}
            title={block.title || block.label || 'Embedded lesson resource'}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms"
            referrerPolicy="no-referrer"
            style={{ height: `${Math.min(Math.max(block.height || 420, 220), 900)}px` }}
          />
        ) : (
          <a className="rich-attachment-card" href={source.toString()} target="_blank" rel="noopener noreferrer">
            <span><strong>{block.title || block.label || 'Open embedded resource'}</strong><small>{source.hostname}</small></span>
            <LinkSquare02Icon size={16} />
          </a>
        )}
        {block.caption && <p className="rich-media-caption">{renderRichText(block.caption)}</p>}
      </div>
    );
  }

  if (block.type === 'attachment') {
    return (
      <a className="rich-attachment-card" href={source.toString()} target="_blank" rel="noopener noreferrer">
        <span><strong>{block.label || block.title || 'Open attachment'}</strong><small>{block.description || source.hostname}</small></span>
        <LinkSquare02Icon size={16} />
      </a>
    );
  }

  return null;
};
