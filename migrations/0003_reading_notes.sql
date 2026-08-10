CREATE TABLE IF NOT EXISTS reading_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  source_text TEXT NOT NULL,
  note_text TEXT NOT NULL DEFAULT '',
  style TEXT NOT NULL CHECK (style IN ('plain', 'highlight', 'circle', 'strike')),
  color TEXT NOT NULL DEFAULT '#f5c84b',
  selection_start INTEGER,
  selection_end INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reading_notes_user_topic
  ON reading_notes(user_id, topic_id, created_at DESC);
