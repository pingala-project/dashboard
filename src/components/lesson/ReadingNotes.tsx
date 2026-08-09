import React, { useEffect, useState } from 'react';
import { Add01Icon, Cancel01Icon, CheckmarkCircle02Icon, Delete02Icon, StickyNote01Icon } from 'hugeicons-react';
import { useToast } from '../../context/ToastContext';

type NoteStyle = 'plain' | 'highlight' | 'circle' | 'strike';

interface ReadingNote {
  id: string;
  topicId: string;
  sourceText: string;
  noteText: string;
  style: NoteStyle;
  createdAt: string;
}

interface SelectionState {
  text: string;
  top: number;
  left: number;
}

const STORAGE_KEY = 'pingala_reading_notes_v1';

function readNotes(): ReadingNote[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export const ReadingNotes: React.FC<{ topicId: string }> = ({ topicId }) => {
  const { showToast } = useToast();
  const [notes, setNotes] = useState<ReadingNote[]>(readNotes);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftStyle, setDraftStyle] = useState<NoteStyle>('highlight');

  const topicNotes = notes.filter((note) => note.topicId === topicId);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    const handleSelection = () => {
      const nativeSelection = window.getSelection();
      const text = nativeSelection?.toString().trim() || '';
      const anchor = nativeSelection?.anchorNode;
      const lessonArticle = document.querySelector('.lesson-article');
      if (!text || !anchor || !lessonArticle?.contains(anchor)) {
        setSelection(null);
        return;
      }
      const range = nativeSelection?.getRangeAt(0);
      if (!range) return;
      const rect = range.getBoundingClientRect();
      setSelection({
        text: text.slice(0, 1200),
        top: Math.max(12, rect.top - 52),
        left: Math.min(Math.max(12, rect.left), window.innerWidth - 190),
      });
    };
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, []);

  const beginNote = (style: NoteStyle = 'highlight') => {
    if (!selection) return;
    setDraftStyle(style);
    setDraftText('');
    setIsOpen(true);
  };

  const saveNote = () => {
    if (!selection) return;
    const note: ReadingNote = {
      id: crypto.randomUUID(),
      topicId,
      sourceText: selection.text,
      noteText: draftText.trim(),
      style: draftStyle,
      createdAt: new Date().toISOString(),
    };
    setNotes((current) => [note, ...current]);
    setSelection(null);
    setIsOpen(false);
    setDraftText('');
    showToast('Note saved', 'Your handwritten reading note is stored on this device.', 'success');
  };

  const deleteNote = (id: string) => {
    setNotes((current) => current.filter((note) => note.id !== id));
    showToast('Note removed', 'The reading note was deleted.', 'success');
  };

  return (
    <div className="reading-notes-shell">
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
            <span><StickyNote01Icon size={16} /> Make a note</span>
            <button onClick={() => setIsOpen(false)} aria-label="Close note composer"><Cancel01Icon size={15} /></button>
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
            <span>Saved locally</span>
            <button className="note-save-button" onClick={saveNote}><CheckmarkCircle02Icon size={14} /> Save note</button>
          </div>
        </div>
      )}

      <div className="reading-notes-header">
        <div>
          <span className="lesson-section-label">Reading notes</span>
          <p>Select any passage to highlight it, circle it, cross it out, or turn it into a handwritten note.</p>
        </div>
        <span className="reading-notes-count">{topicNotes.length}</span>
      </div>

      {topicNotes.length > 0 && (
        <div className="reading-notes-grid">
          {topicNotes.map((note) => (
            <article key={note.id} className="reading-note-card">
              <button className="reading-note-delete" onClick={() => deleteNote(note.id)} aria-label="Delete note"><Delete02Icon size={14} /></button>
              <div className={`reading-note-source note-style-${note.style}`}>{note.sourceText}</div>
              {note.noteText && <p>{note.noteText}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
