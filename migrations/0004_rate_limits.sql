-- Fixed-window rate limiting buckets.
-- key format: "<scope>:<identifier>:<window_index>" e.g. "auth:ip:1.2.3.4:1724160000"
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx ON rate_limits (window_start);
