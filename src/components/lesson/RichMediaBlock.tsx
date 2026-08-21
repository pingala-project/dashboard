import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LinkSquare02Icon, Cancel01Icon } from 'hugeicons-react';
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

/** Full-screen click-to-zoom viewer for lesson figures. */
const ImageLightbox: React.FC<{ src: string; alt: string; onClose: () => void }> = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className="image-lightbox-overlay" onClick={onClose} role="dialog" aria-label="Zoomed image">
      <button className="image-lightbox-close" aria-label="Close zoomed image">
        <Cancel01Icon size={20} />
      </button>
      <img src={src} alt={alt} onClick={(event) => event.stopPropagation()} />
    </div>,
    document.body
  );
};

export const RichMediaBlock: React.FC<{ block: ContentBlock }> = ({ block }) => {
  const [zoomed, setZoomed] = useState(false);

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
          className="rich-media-zoomable"
          onClick={() => setZoomed(true)}
          title="Click to zoom"
        />
        {block.caption && <figcaption>{renderRichText(block.caption)}</figcaption>}
        {zoomed && (
          <ImageLightbox
            src={source.toString()}
            alt={block.alt || block.caption || 'Lesson illustration'}
            onClose={() => setZoomed(false)}
          />
        )}
      </figure>
    );
  }

  if (block.type === 'embed') {
    const allowed = source.protocol === 'https:' && EMBED_HOSTS.has(source.hostname);
    return (
      <div className="rich-embed-block">
        {allowed ? (
          <div className="rich-embed-frame">
            <iframe
              src={source.toString()}
              title={block.title || block.label || 'Embedded lesson resource'}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            />
          </div>
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
