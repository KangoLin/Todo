use rusqlite::{Connection, params};
use crate::models::Comment;

pub fn get_by_card(conn: &Connection, card_id: &str) -> Result<Vec<Comment>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, card_id, content, created_at FROM comments WHERE card_id = ?1 ORDER BY created_at"
    ).map_err(|e| format!("Failed to query comments: {}", e))?;
    let comments = stmt.query_map(params![card_id], |row| {
        Ok(Comment {
            id: row.get(0)?,
            card_id: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
        })
    }).map_err(|e| format!("Failed to map comments: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(comments)
}

pub fn create(conn: &Connection, card_id: &str, content: &str) -> Result<Comment, String> {
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO comments (id, card_id, content) VALUES (?1, ?2, ?3)",
        params![id, card_id, content],
    ).map_err(|e| format!("Failed to create comment: {}", e))?;
    conn.query_row(
        "SELECT id, card_id, content, created_at FROM comments WHERE id = ?1",
        params![id],
        |row| Ok(Comment {
            id: row.get(0)?,
            card_id: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
        }),
    ).map_err(|e| format!("Comment not found: {}", e))
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM comments WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete comment: {}", e))?;
    Ok(())
}
