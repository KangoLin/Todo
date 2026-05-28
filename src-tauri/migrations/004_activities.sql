CREATE TABLE activities (
    id         TEXT PRIMARY KEY,
    card_id    TEXT REFERENCES cards(id) ON DELETE SET NULL,
    board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    action     TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_activities_board ON activities(board_id, created_at DESC);
