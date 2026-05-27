use rusqlite::{Connection, params};
use crate::models::{Card, CardDetail, CreateCardRequest, UpdateCardRequest, MoveCardRequest, MoveCardWithinColumnRequest};
use crate::db::subtasks;
use crate::db::tags;

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
    let mut stmt = conn.prepare(
        "SELECT id, column_id, title, description, sort_order, priority, due_date, cover_color, is_archived, created_at, updated_at \
         FROM cards WHERE column_id = ?1 AND is_archived = 0 ORDER BY sort_order, created_at"
    ).map_err(|e| format!("Failed to query cards: {}", e))?;
    let cards = stmt.query_map(params![column_id], |row| {
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
        })
    }).map_err(|e| format!("Failed to map cards: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(cards)
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Card, String> {
    conn.query_row(
        "SELECT id, column_id, title, description, sort_order, priority, due_date, cover_color, is_archived, created_at, updated_at FROM cards WHERE id = ?1",
        params![id],
        |row| {
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
            })
        },
    ).map_err(|e| format!("Card not found: {}", e))
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

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM cards WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete card: {}", e))?;
    Ok(())
}

pub fn get_all(conn: &Connection) -> Result<Vec<Card>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, column_id, title, description, sort_order, priority, due_date, cover_color, is_archived, created_at, updated_at \
         FROM cards ORDER BY sort_order, created_at"
    ).map_err(|e| format!("Failed to query cards: {}", e))?;
    let cards = stmt.query_map([], |row| {
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
        })
    }).map_err(|e| format!("Failed to map cards: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(cards)
}
