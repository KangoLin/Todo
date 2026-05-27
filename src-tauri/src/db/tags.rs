use rusqlite::{Connection, params};
use crate::models::{Tag, CreateTagRequest, CardTagRequest};

pub fn create(conn: &Connection, req: &CreateTagRequest) -> Result<Tag, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let color = req.color.clone().unwrap_or_else(|| "#3b82f6".to_string());
    conn.execute(
        "INSERT OR IGNORE INTO tags (id, board_id, name, color) VALUES (?1, ?2, ?3, ?4)",
        params![id, req.board_id, req.name, color],
    ).map_err(|e| format!("Failed to create tag: {}", e))?;
    conn.query_row(
        "SELECT id, board_id, name, color, created_at FROM tags WHERE board_id = ?1 AND name = ?2",
        params![req.board_id, req.name],
        |row| {
            Ok(Tag {
                id: row.get(0)?,
                board_id: row.get(1)?,
                name: row.get(2)?,
                color: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    ).map_err(|e| format!("Tag not found after create: {}", e))
}

pub fn get_by_board(conn: &Connection, board_id: &str) -> Result<Vec<Tag>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, board_id, name, color, created_at FROM tags WHERE board_id = ?1 ORDER BY name"
    ).map_err(|e| format!("Failed to query tags: {}", e))?;
    let tags = stmt.query_map(params![board_id], |row| {
        Ok(Tag {
            id: row.get(0)?,
            board_id: row.get(1)?,
            name: row.get(2)?,
            color: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| format!("Failed to map tags: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(tags)
}

pub fn get_by_card(conn: &Connection, card_id: &str) -> Result<Vec<Tag>, String> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.board_id, t.name, t.color, t.created_at \
         FROM tags t JOIN card_tags ct ON t.id = ct.tag_id WHERE ct.card_id = ?1 ORDER BY t.name"
    ).map_err(|e| format!("Failed to query card tags: {}", e))?;
    let tags = stmt.query_map(params![card_id], |row| {
        Ok(Tag {
            id: row.get(0)?,
            board_id: row.get(1)?,
            name: row.get(2)?,
            color: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| format!("Failed to map card tags: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(tags)
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM tags WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete tag: {}", e))?;
    Ok(())
}

pub fn add_to_card(conn: &Connection, req: &CardTagRequest) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?1, ?2)",
        params![req.card_id, req.tag_id],
    ).map_err(|e| format!("Failed to add tag to card: {}", e))?;
    Ok(())
}

pub fn remove_from_card(conn: &Connection, req: &CardTagRequest) -> Result<(), String> {
    conn.execute(
        "DELETE FROM card_tags WHERE card_id = ?1 AND tag_id = ?2",
        params![req.card_id, req.tag_id],
    ).map_err(|e| format!("Failed to remove tag from card: {}", e))?;
    Ok(())
}

pub fn get_all(conn: &Connection) -> Result<Vec<Tag>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, board_id, name, color, created_at FROM tags ORDER BY name"
    ).map_err(|e| format!("Failed to query tags: {}", e))?;
    let tags = stmt.query_map([], |row| {
        Ok(Tag {
            id: row.get(0)?,
            board_id: row.get(1)?,
            name: row.get(2)?,
            color: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| format!("Failed to map tags: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(tags)
}
