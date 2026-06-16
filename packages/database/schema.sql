-- Linkly database schema
-- Managed by the iii database worker (sqlite:./data/iii.db)
-- Workers call ensureSchema() on startup to create these tables.

CREATE TABLE IF NOT EXISTS links (
  code       TEXT PRIMARY KEY,
  url        TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clicks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL,
  clicked_at TEXT NOT NULL
);

-- Analytics database (sqlite:./data/analytics.db)
-- Owned by the analytics worker.

CREATE TABLE IF NOT EXISTS daily_link_counts (
  day   TEXT PRIMARY KEY,
  count INTEGER NOT NULL
);
