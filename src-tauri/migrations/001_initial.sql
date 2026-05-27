PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA encoding = 'UTF-8';

CREATE TABLE projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    color       TEXT DEFAULT '#6366f1',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE boards (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_boards_project ON boards(project_id);

CREATE TABLE columns (
    id          TEXT PRIMARY KEY,
    board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    wip_limit   INTEGER DEFAULT NULL,
    color       TEXT DEFAULT '#6b7280',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_columns_board ON columns(board_id);

CREATE TABLE cards (
    id            TEXT PRIMARY KEY,
    column_id     TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT DEFAULT '{}',
    sort_order    INTEGER NOT NULL DEFAULT 0,
    priority      INTEGER DEFAULT 0,
    due_date      TEXT DEFAULT NULL,
    cover_color   TEXT DEFAULT NULL,
    is_archived   INTEGER DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_cards_column ON cards(column_id);
CREATE INDEX idx_cards_archived ON cards(is_archived);

CREATE TABLE subtasks (
    id          TEXT PRIMARY KEY,
    card_id     TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    is_done     INTEGER DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_subtasks_card ON subtasks(card_id);

CREATE TABLE tags (
    id        TEXT PRIMARY KEY,
    board_id  TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name      TEXT NOT NULL,
    color     TEXT DEFAULT '#3b82f6',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(board_id, name)
);
CREATE INDEX idx_tags_board ON tags(board_id);

CREATE TABLE card_tags (
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, tag_id)
);
CREATE INDEX idx_card_tags_card ON card_tags(card_id);
CREATE INDEX idx_card_tags_tag ON card_tags(tag_id);

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE VIRTUAL TABLE cards_fts USING fts5(
    card_id UNINDEXED,
    title,
    description,
    content='cards',
    content_rowid='rowid',
    tokenize='unicode61'
);

CREATE TRIGGER cards_ai AFTER INSERT ON cards BEGIN
    INSERT INTO cards_fts(rowid, card_id, title, description)
    VALUES (new.rowid, new.id, new.title, new.description);
END;

CREATE TRIGGER cards_ad AFTER DELETE ON cards BEGIN
    INSERT INTO cards_fts(cards_fts, rowid, card_id, title, description)
    VALUES ('delete', old.rowid, old.id, old.title, old.description);
END;

CREATE TRIGGER cards_au AFTER UPDATE ON cards BEGIN
    INSERT INTO cards_fts(cards_fts, rowid, card_id, title, description)
    VALUES ('delete', old.rowid, old.id, old.title, old.description);
    INSERT INTO cards_fts(rowid, card_id, title, description)
    VALUES (new.rowid, new.id, new.title, new.description);
END;
