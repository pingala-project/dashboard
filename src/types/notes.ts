export type NoteStyle = 'plain' | 'highlight' | 'circle' | 'strike';

export interface ReadingNote {
  id: string;
  topicId: string;
  sourceText: string;
  noteText: string;
  style: NoteStyle;
  color: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingNoteInput {
  topicId: string;
  sourceText: string;
  noteText: string;
  style: NoteStyle;
  color?: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
}
