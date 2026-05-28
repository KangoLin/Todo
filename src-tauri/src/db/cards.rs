use rusqlite::{Connection, params};
use crate::models::{Card, CardDetail, CreateCardRequest, UpdateCardRequest, MoveCardRequest, MoveCardWithinColumnRequest};
use crate::db::subtasks;
use crate::db::tags;

const CARD_SELECT: &str = "\
    SELECT c.id, c.column_id, c.title, c.description, c.sort_order, c.priority, \
           c.due_date, c.cover_color, c.is_archived, c.created_at, c.updated_at, \
           COALESCE(SUM(CASE WHEN s.is_done = 1 THEN 1 ELSE 0 END), 0), \
           COALESCE(COUNT(s.id), 0) \
    FROM cards c LEFT JOIN subtasks s ON s.card_id = c.id";

fn card_from_row(row: &rusqlite::Row) -> rusqlite::Result<Card> {
    Ok(Card {
        id: row.get(0)?,
        column_id: row.get(1)?,
        title: row.get(2)?,
        description: row.get(3)?,
        sort_order: row.get(4)?,
        priority: row.get(5)?,
        due_date: row.get(6)?,
        cover_color: row.get(7)?,
        is_archived: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
        subtask_done: row.get(11)?,
        subtask_total: row.get(12)?,
    })
}

pub fn create(conn: &Connection, req: &CreateCardRequest) -> Result<Card, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM cards WHERE column_id = ?1 AND is_archived = 0",
        params![req.column_id],
        |row| row.get(0),
    ).unwrap_or(0);
    conn.execute(
        "INSERT INTO cards (id, column_id, title, sort_order) VALUES (?1, ?2, ?3, ?4)",
        params![id, req.column_id, req.title, max_order],
    ).map_err(|e| format!("Failed to create card: {}", e))?;
    get_by_id(conn, &id)
}

pub fn get_by_column(conn: &Connection, column_id: &str) -> Result<Vec<Card>, String> {
    let sql = format!("{} WHERE c.column_id = ?1 AND c.is_archived = 0 GROUP BY c.id ORDER BY c.sort_order, c.created_at", CARD_SELECT);
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to query cards: {}", e))?;
    let cards = stmt.query_map(params![column_id], card_from_row)
        .map_err(|e| format!("Failed to map cards: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(cards)
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Card, String> {
    let sql = format!("{} WHERE c.id = ?1 GROUP BY c.id", CARD_SELECT);
    conn.query_row(&sql, params![id], card_from_row)
        .map_err(|e| format!("Card not found: {}", e))
}

pub fn get_card_detail(conn: &Connection, id: &str) -> Result<CardDetail, String> {
    let card = get_by_id(conn, id)?;
    let subtasks = subtasks::get_by_card(conn, id)?;
    let card_tags = tags::get_by_card(conn, id)?;
    Ok(CardDetail { card, subtasks, tags: card_tags })
}

pub fn update(conn: &Connection, req: &UpdateCardRequest) -> Result<Card, String> {
    let existing = get_by_id(conn, &req.id)?;
    let title = req.title.clone().unwrap_or(existing.title);
    let description = req.description.clone().unwrap_or(existing.description);
    let priority = req.priority.unwrap_or(existing.priority);
    let due_date = req.due_date.clone().or(existing.due_date);
    let cover_color = req.cover_color.clone().or(existing.cover_color);
    conn.execute(
        "UPDATE cards SET title = ?1, description = ?2, priority = ?3, due_date = ?4, cover_color = ?5, updated_at = datetime('now') WHERE id = ?6",
        params![title, description, priority, due_date, cover_color, req.id],
    ).map_err(|e| format!("Failed to update card: {}", e))?;
    get_by_id(conn, &req.id)
}

pub fn move_card(conn: &Connection, req: &MoveCardRequest) -> Result<(), String> {
    conn.execute(
        "UPDATE cards SET column_id = ?1, sort_order = ?2, updated_at = datetime('now') WHERE id = ?3",
        params![req.target_column_id, req.target_sort_order, req.card_id],
    ).map_err(|e| format!("Failed to move card: {}", e))?;
    Ok(())
}

pub fn move_within_column(conn: &Connection, req: &MoveCardWithinColumnRequest) -> Result<(), String> {
    conn.execute(
        "UPDATE cards SET sort_order = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![req.target_sort_order, req.card_id],
    ).map_err(|e| format!("Failed to reorder card: {}", e))?;
    Ok(())
}

pub fn archive(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE cards SET is_archived = 1, updated_at = datetime('now') WHERE id = ?1",
        params![id],
    ).map_err(|e| format!("Failed to archive card: {}", e))?;
    Ok(())
}

pub fn restore(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE cards SET is_archived = 0, updated_at = datetime('now') WHERE id = ?1",
        params![id],
    ).map_err(|e| format!("Failed to restore card: {}", e))?;
    Ok(())
}

pub fn get_archived_by_board(conn: &Connection, board_id: &str) -> Result<Vec<Card>, String> {
    let sql = format!("{} JOIN columns col ON c.column_id = col.id WHERE col.board_id = ?1 AND c.is_archived = 1 GROUP BY c.id ORDER BY c.updated_at DESC", CARD_SELECT);
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to query archived cards: {}", e))?;
    let cards = stmt.query_map(params![board_id], card_from_row)
        .map_err(|e| format!("Failed to map archived cards: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(cards)
}

pub fn copy_card(conn: &Connection, card_id: &str, target_column_id: &str) -> Result<Card, String> {
    let source = get_by_id(conn, card_id)?;
    let new_id = uuid::Uuid::new_v4().to_string();
    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM cards WHERE column_id = ?1 AND is_archived = 0",
        params![target_column_id],
        |row| row.get(0),
    ).unwrap_or(0);
    conn.execute(
        "INSERT INTO cards (id, column_id, title, description, sort_order, priority, due_date, cover_color) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![new_id, target_column_id, source.title, source.description, max_order, source.priority, source.due_date, source.cover_color],
    ).map_err(|e| format!("Failed to copy card: {}", e))?;
    let mut tag_stmt = conn.prepare("SELECT tag_id FROM card_tags WHERE card_id = ?1")
        .map_err(|e| format!("Failed to read card tags: {}", e))?;
    let tag_ids: Vec<String> = tag_stmt.query_map(params![card_id], |row| row.get(0))
        .map_err(|e| format!("Failed to map card tags: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    for tid in &tag_ids {
        conn.execute("INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?1, ?2)", params![new_id, tid])
            .map_err(|e| format!("Failed to copy tag: {}", e))?;
    }
    let mut sub_stmt = conn.prepare("SELECT title, is_done FROM subtasks WHERE card_id = ?1")
        .map_err(|e| format!("Failed to read subtasks: {}", e))?;
    let subtasks: Vec<(String, i32)> = sub_stmt.query_map(params![card_id], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
    }).map_err(|e| format!("Failed to map subtasks: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    for (title, is_done) in &subtasks {
        let st_id = uuid::Uuid::new_v4().to_string();
        conn.execute("INSERT INTO subtasks (id, card_id, title, is_done) VALUES (?1, ?2, ?3, ?4)",
            params![st_id, new_id, title, is_done])
            .map_err(|e| format!("Failed to copy subtask: {}", e))?;
    }
    get_by_id(conn, &new_id)
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM cards WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete card: {}", e))?;
    Ok(())
}

pub fn get_board_id(conn: &Connection, card_id: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT c.board_id FROM cards AS ca JOIN columns AS c ON ca.column_id = c.id WHERE ca.id = ?1",
        params![card_id],
        |row| row.get(0),
    ).map_err(|e| format!("Card not found: {}", e))
}

pub fn get_board_id_by_column(conn: &Connection, column_id: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT board_id FROM columns WHERE id = ?1",
        params![column_id],
        |row| row.get(0),
    ).map_err(|e| format!("Column not found: {}", e))
}

pub fn get_all(conn: &Connection) -> Result<Vec<Card>, String> {
    let sql = format!("{} GROUP BY c.id ORDER BY c.sort_order, c.created_at", CARD_SELECT);
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to query cards: {}", e))?;
    let cards = stmt.query_map([], card_from_row)
        .map_err(|e| format!("Failed to map cards: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(cards)
}
