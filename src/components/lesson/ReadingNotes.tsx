import React, { useEffect, useState } from 'react';
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

function markSavedSelections(notes: ReadingNote[]) {
  const root = document.querySelector('.lesson-blocks');
  if (!root) return () => undefined;

  root.querySelectorAll('[data-reading-note-id]').forEach((element) => {
    const parent = element.parentNode;
    if (!parent) return;
    while (element.firstChild) parent.insertBefore(element.firstChild, element);
    parent.removeChild(element);
  });

  notes.forEach((note) => {
    if (note.style === 'plain') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Text | null = null;
    while (walker.nextNode()) {
      const candidate = walker.currentNode as Text;
      if (candidate.nodeValue?.includes(note.sourceText)) {
        node = candidate;
        break;
      }
    }
    if (!node || !node.nodeValue) return;
    const start = node.nodeValue.indexOf(note.sourceText);
    if (start < 0) return;
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + note.sourceText.length);
    const mark = document.createElement('span');
    mark.dataset.readingNoteId = note.id;
    mark.className = `reading-note-mark note-style-${note.style}`;
    mark.style.setProperty('--reading-note-color', note.color);
    try {
      range.surroundContents(mark);
    } catch {
      // Selections spanning multiple rendered nodes remain visible in the note card.
    }
  });

  return () => {
    root.querySelectorAll('[data-reading-note-id]').forEach((element) => {
      const parent = element.parentNode;
      if (!parent) return;
      while (element.firstChild) parent.insertBefore(element.firstChild, element);
      parent.removeChild(element);
    });
  };
}

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

  useEffect(() => {
    let active = true;
    setNotes([]);
    if (!user) return () => { active = false; };
    void refreshNotes(topicId).then((remoteNotes) => {
      if (active) setNotes(remoteNotes);
    });
    return () => { active = false; };
  }, [refreshNotes, topicId, user]);

  useEffect(() => markSavedSelections(notes), [notes]);

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
        left: Math.min(Math.max(12, rect.left), window.innerWidth - 235),
        start: Number.isInteger(range.startOffset) ? range.startOffset : null,
        end: Number.isInteger(range.endOffset) ? range.endOffset : null,
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
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
