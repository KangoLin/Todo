use rusqlite::{Connection, params};
use crate::models::{Subtask, CreateSubtaskRequest};

pub fn create(conn: &Connection, req: &CreateSubtaskRequest) -> Result<Subtask, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM subtasks WHERE card_id = ?1",
        params![req.card_id],
        |row| row.get(0),
    ).unwrap_or(0);
    conn.execute(
        "INSERT INTO subtasks (id, card_id, title, sort_order) VALUES (?1, ?2, ?3, ?4)",
        params![id, req.card_id, req.title, max_order],
    ).map_err(|e| format!("Failed to create subtask: {}", e))?;
    get_by_id(conn, &id)
}

pub fn get_by_card(conn: &Connection, card_id: &str) -> Result<Vec<Subtask>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, card_id, title, is_done, sort_order, created_at FROM subtasks WHERE card_id = ?1 ORDER BY sort_order, created_at"
    ).map_err(|e| format!("Failed to query subtasks: {}", e))?;
    let subtasks = stmt.query_map(params![card_id], |row| {
        Ok(Subtask {
            id: row.get(0)?,
            card_id: row.get(1)?,
            title: row.get(2)?,
            is_done: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
        })
    }).map_err(|e| format!("Failed to map subtasks: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(subtasks)
}

fn get_by_id(conn: &Connection, id: &str) -> Result<Subtask, String> {
    conn.query_row(
        "SELECT id, card_id, title, is_done, sort_order, created_at FROM subtasks WHERE id = ?1",
        params![id],
        |row| {
            Ok(Subtask {
                id: row.get(0)?,
                card_id: row.get(1)?,
                title: row.get(2)?,
                is_done: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
            })
        },
    ).map_err(|e| format!("Subtask not found: {}", e))
}

pub fn toggle(conn: &Connection, id: &str) -> Result<Subtask, String> {
    conn.execute(
        "UPDATE subtasks SET is_done = CASE WHEN is_done = 0 THEN 1 ELSE 0 END WHERE id = ?1",
        params![id],
    ).map_err(|e| format!("Failed to toggle subtask: {}", e))?;
    get_by_id(conn, id)
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM subtasks WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete subtask: {}", e))?;
    Ok(())
}

pub fn get_all(conn: &Connection) -> Result<Vec<Subtask>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, card_id, title, is_done, sort_order, created_at FROM subtasks ORDER BY sort_order, created_at"
    ).map_err(|e| format!("Failed to query subtasks: {}", e))?;
    let subtasks = stmt.query_map([], |row| {
        Ok(Subtask {
            id: row.get(0)?,
            card_id: row.get(1)?,
            title: row.get(2)?,
            is_done: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
        })
    }).map_err(|e| format!("Failed to map subtasks: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(subtasks)
}
