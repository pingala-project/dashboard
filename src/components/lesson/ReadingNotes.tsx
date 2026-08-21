import React, { useCallback, useEffect, useState } from 'react';
import { Add01Icon, Cancel01Icon, CheckmarkCircle02Icon, Delete02Icon, Edit02Icon, GithubIcon, StickyNote01Icon } from 'hugeicons-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { NoteStyle, ReadingNote } from '../../types/notes';

interface SelectionState {
  text: string;
  top: number;
  left: number;
  start: number | null;
  end: number | null;
}

interface HighlightOverlay {
  id: string;
  noteId: string;
  style: NoteStyle;
  color: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

const MAX_SOURCE_CHARS = 1200;

function getLessonRoot(): HTMLElement | null {
  return document.querySelector('.lesson-blocks');
}

/** Converts a (node, offset) point into a document-order character offset within root. */
function getTextOffset(root: Element, node: Node, offset: number): number | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === node) return total + offset;
    total += current.nodeValue?.length ?? 0;
    current = walker.nextNode();
  }
  return null;
}

/**
 * Resolves a stored note back to a DOM Range. Prefers the exact document offsets
 * captured at creation time (robust across repeated passages and multi-node
 * selections); falls back to substring matching when content has shifted.
 */
function resolveNoteRange(root: HTMLElement, note: ReadingNote): Range | null {
  if (
    typeof note.selectionStart === 'number' &&
    typeof note.selectionEnd === 'number' &&
    note.selectionEnd > note.selectionStart
  ) {
    const range = document.createRange();
    let startPoint: { node: Text; offset: number } | null = null;
    let endPoint: { node: Text; offset: number } | null = null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let total = 0;
    let current = walker.nextNode() as Text | null;
    while (current) {
      const len = current.nodeValue?.length ?? 0;
      if (!startPoint && note.selectionStart >= total && note.selectionStart <= total + len) {
        startPoint = { node: current, offset: Math.min(note.selectionStart - total, len) };
      }
      if (note.selectionEnd >= total && note.selectionEnd <= total + len) {
        endPoint = { node: current, offset: Math.min(note.selectionEnd - total, len) };
        break;
      }
      total += len;
      current = walker.nextNode() as Text | null;
    }
    if (startPoint && endPoint) {
      try {
        range.setStart(startPoint.node, startPoint.offset);
        range.setEnd(endPoint.node, endPoint.offset);
        return range;
      } catch {
        /* fall through to substring fallback */
      }
    }
  }

  // Fallback: first text node containing the passage verbatim.
  const sourceText = note.sourceText.trim();
  if (!sourceText) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const value = node.nodeValue ?? '';
    const index = value.indexOf(sourceText);
    if (index >= 0) {
      try {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + sourceText.length);
        return range;
      } catch {
        return null;
      }
    }
    node = walker.nextNode() as Text | null;
  }
  return null;
}

function computeHighlightRects(notes: ReadingNote[]): HighlightOverlay[] {
  const root = getLessonRoot();
  if (!root) return [];

  const overlays: HighlightOverlay[] = [];
  const rootRect = root.getBoundingClientRect();

  notes.forEach((note) => {
    if (note.style === 'plain') return;
    const range = resolveNoteRange(root, note);
    if (!range) return;
    Array.from(range.getClientRects()).forEach((rect, idx) => {
      overlays.push({
        id: `${note.id}-${idx}`,
        noteId: note.id,
        style: note.style,
        color: note.color,
        top: rect.top - rootRect.top,
        left: rect.left - rootRect.left,
        width: rect.width,
        height: rect.height,
      });
    });
  });

  return overlays;
}

function formatRelativeTime(isoTimestamp: string): string {
  const timestamp = Date.parse(isoTimestamp);
  if (Number.isNaN(timestamp)) return '';
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const divisions: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.345, 'week'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];
  let duration = seconds;
  for (const [amount, unit] of divisions) {
    if (Math.abs(duration) < amount) {
      return formatter.format(Math.round(duration), unit);
    }
    duration /= amount;
  }
  return '';
}

import { createPortal } from 'react-dom';

export const ReadingNotes: React.FC<{ topicId: string }> = ({ topicId }) => {
  const { user, login, refreshNotes, createNote, updateNote, deleteNote } = useAuth();
  const { showToast } = useToast();
  const [notes, setNotes] = useState<ReadingNote[]>([]);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftStyle, setDraftStyle] = useState<NoteStyle>('highlight');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [overlays, setOverlays] = useState<HighlightOverlay[]>([]);

  useEffect(() => {
    let active = true;
    setNotes([]);
    if (!user) return () => { active = false; };
    void refreshNotes(topicId).then((remoteNotes) => {
      if (active) setNotes(remoteNotes);
    });
    return () => { active = false; };
  }, [refreshNotes, topicId, user]);

  const updateOverlays = useCallback(() => {
    setOverlays(computeHighlightRects(notes));
  }, [notes]);

  useEffect(() => {
    updateOverlays();
    const root = getLessonRoot();

    // Recompute on any layout change of the lesson body — not just window resize —
    // so highlights survive font loading, image loading, and accordion toggles.
    window.addEventListener('resize', updateOverlays);
    let observer: ResizeObserver | null = null;
    if (root && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateOverlays);
      observer.observe(root);
    }
    void document.fonts?.ready.then(updateOverlays).catch(() => {});
    const images = Array.from(root?.querySelectorAll('img') ?? []);
    images.forEach((img) => img.addEventListener('load', updateOverlays));

    return () => {
      window.removeEventListener('resize', updateOverlays);
      observer?.disconnect();
      images.forEach((img) => img.removeEventListener('load', updateOverlays));
    };
  }, [updateOverlays]);

  useEffect(() => {
    const handleSelection = () => {
      const nativeSelection = window.getSelection();
      const rawText = nativeSelection?.toString() || '';
      const trimmed = rawText.trim();
      const anchor = nativeSelection?.anchorNode;
      const focusNode = nativeSelection?.focusNode;
      const lessonArticle = document.querySelector('.lesson-article');
      const lessonBlocks = getLessonRoot();
      if (!trimmed || !anchor || !focusNode || !lessonArticle?.contains(anchor) || !lessonBlocks) {
        setSelection(null);
        return;
      }
      const range = nativeSelection?.getRangeAt(0);
      if (!range || range.collapsed) {
        setSelection(null);
        return;
      }

      // Capture exact document-order offsets so the highlight can be restored
      // precisely later, even for repeated or multi-node passages.
      let startOffset = getTextOffset(lessonBlocks, range.startContainer, range.startOffset);
      let endOffset = getTextOffset(lessonBlocks, range.endContainer, range.endOffset);
      if (startOffset !== null && endOffset !== null && endOffset > startOffset) {
        // Narrow to the trimmed passage so stored offsets match the stored text.
        const leading = rawText.length - rawText.trimStart().length;
        const trailing = rawText.length - rawText.trimEnd().length;
        startOffset += leading;
        endOffset -= trailing;
        if (endOffset - startOffset > MAX_SOURCE_CHARS) {
          endOffset = startOffset + MAX_SOURCE_CHARS;
        }
      } else {
        startOffset = null;
        endOffset = null;
      }

      const rect = range.getBoundingClientRect();
      setSelection({
        text: trimmed.slice(0, MAX_SOURCE_CHARS),
        top: Math.max(12, rect.top - 52),
        left: Math.min(Math.max(12, rect.left), window.innerWidth - 235),
        start: startOffset,
        end: endOffset,
      });
    };
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, []);

  const beginNote = (style: NoteStyle = 'highlight', note?: ReadingNote) => {
    setDraftStyle(style);
    setDraftText(note?.noteText || '');
    setEditingNoteId(note?.id || null);
    if (note) {
      setSelection({ text: note.sourceText, top: 0, left: 0, start: note.selectionStart, end: note.selectionEnd });
    }
    setIsOpen(true);
  };

  const closeComposer = () => {
    setIsOpen(false);
    setEditingNoteId(null);
    setDraftText('');
    setSelection(null);
  };

  const saveNote = async () => {
    if (!selection) return;
    if (!user) {
      showToast('Log in to save notes', 'Your annotations will follow your account across devices.', 'info');
      login();
      return;
    }
    setIsSaving(true);
    const saved = editingNoteId
      ? await updateNote(editingNoteId, { noteText: draftText.trim(), style: draftStyle })
      : await createNote({
        topicId,
        sourceText: selection.text,
        noteText: draftText.trim(),
        style: draftStyle,
        selectionStart: selection.start,
        selectionEnd: selection.end,
      });
    setIsSaving(false);
    if (!saved) {
      showToast('Note could not be saved', 'Check your connection and try again.', 'error');
      return;
    }
    setNotes((current) => editingNoteId ? current.map((note) => note.id === saved.id ? saved : note) : [saved, ...current]);
    closeComposer();
    showToast(editingNoteId ? 'Note updated' : 'Note saved', 'Your annotation is attached to your Pingala account.', 'success');
  };

  const removeNote = async (id: string) => {
    if (!user) return;
    if (!await deleteNote(id)) {
      showToast('Note could not be removed', 'Check your connection and try again.', 'error');
      return;
    }
    setNotes((current) => current.filter((note) => note.id !== id));
    showToast('Note removed', 'The reading note was deleted from your account.', 'success');
  };

  const portalTarget = getLessonRoot();

  return (
    <div className="reading-notes-shell">
      {overlays.length > 0 && portalTarget &&
        createPortal(
          overlays.map(overlay => (
            <div
              key={overlay.id}
              className={`reading-note-mark note-style-${overlay.style}`}
              style={{
                position: 'absolute',
                top: overlay.top,
                left: overlay.left,
                width: overlay.width,
                height: overlay.height,
                '--reading-note-color': overlay.color
              } as React.CSSProperties}
            />
          )),
          portalTarget
        )}

      {selection && !isOpen && (
        <div className="selection-note-toolbar" style={{ top: selection.top, left: selection.left }}>
          <button onClick={() => beginNote('highlight')}><span className="selection-highlight-swatch" /> Highlight</button>
          <button onClick={() => beginNote('circle')}>Circle</button>
          <button onClick={() => beginNote('strike')}>Cross out</button>
          <button className="selection-add-note" onClick={() => beginNote('plain')}><Add01Icon size={14} /> Note</button>
        </div>
      )}

      {isOpen && selection && (
        <div className="reading-note-composer" role="dialog" aria-label="Create reading note">
          <div className="reading-note-composer-header">
            <span><StickyNote01Icon size={16} /> {editingNoteId ? 'Edit note' : 'Make a note'}</span>
            <button onClick={closeComposer} aria-label="Close note composer"><Cancel01Icon size={15} /></button>
          </div>
          <div className={`note-source-preview note-style-${draftStyle}`}>{selection.text}</div>
          <div className="note-style-picker" aria-label="Note mark style">
            {(['plain', 'highlight', 'circle', 'strike'] as NoteStyle[]).map((style) => (
              <button key={style} className={draftStyle === style ? 'active' : ''} onClick={() => setDraftStyle(style)}>
                {style === 'plain' ? 'Plain' : style === 'highlight' ? 'Highlight' : style === 'circle' ? 'Circle' : 'Cross out'}
              </button>
            ))}
          </div>
          <textarea
            className="reading-note-input"
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            placeholder="Write what you want to remember…"
            autoFocus
          />
          <div className="reading-note-composer-footer">
            {user ? <span><GithubIcon size={14} /> Saved to your account</span> : <span>Log in to save this note</span>}
            <button className="note-save-button" onClick={() => void saveNote()} disabled={isSaving}>
              <CheckmarkCircle02Icon size={14} /> {isSaving ? 'Saving…' : user ? 'Save note' : 'Log in to save'}
            </button>
          </div>
        </div>
      )}

      <div className="reading-notes-header">
        <div>
          <span className="lesson-section-label">Reading notes</span>
          <p>{user ? 'Select any passage to highlight it, circle it, cross it out, or turn it into a handwritten note.' : 'Select a passage to preview an annotation. Log in to save notes and highlights.'}</p>
        </div>
        <span className="reading-notes-count">{notes.length}</span>
      </div>

      {notes.length > 0 && (
        <div className="reading-notes-grid">
          {notes.map((note) => (
            <article key={note.id} className={`reading-note-card note-card-style-${note.style}`}>
              <div className="reading-note-card-actions">
                <button onClick={() => beginNote(note.style, note)} aria-label="Edit note"><Edit02Icon size={14} /></button>
                <button onClick={() => void removeNote(note.id)} aria-label="Delete note"><Delete02Icon size={14} /></button>
              </div>
              <div className={`reading-note-source note-style-${note.style}`}>{note.sourceText}</div>
              {note.noteText && <p>{note.noteText}</p>}
              <time
                className="reading-note-timestamp"
                dateTime={note.updatedAt ?? note.createdAt}
                title={new Date(note.updatedAt ?? note.createdAt).toLocaleString()}
              >
                {formatRelativeTime(note.updatedAt ?? note.createdAt)}
              </time>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
