use rusqlite::{Connection, params};
use crate::models::Activity;

pub fn get_by_board(conn: &Connection, board_id: &str, limit: i64) -> Result<Vec<Activity>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, card_id, board_id, action, description, created_at FROM activities WHERE board_id = ?1 ORDER BY created_at DESC LIMIT ?2"
    ).map_err(|e| format!("Failed to query activities: {}", e))?;
    let activities = stmt.query_map(params![board_id, limit], |row| {
        Ok(Activity {
            id: row.get(0)?,
            card_id: row.get(1)?,
            board_id: row.get(2)?,
            action: row.get(3)?,
            description: row.get(4)?,
            created_at: row.get(5)?,
        })
    }).map_err(|e| format!("Failed to map activities: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(activities)
}

pub fn create(conn: &Connection, board_id: &str, card_id: Option<&str>, action: &str, description: &str) -> Result<Activity, String> {
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO activities (id, card_id, board_id, action, description) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, card_id, board_id, action, description],
    ).map_err(|e| format!("Failed to create activity: {}", e))?;
    conn.query_row(
        "SELECT id, card_id, board_id, action, description, created_at FROM activities WHERE id = ?1",
        params![id],
        |row| Ok(Activity {
            id: row.get(0)?,
            card_id: row.get(1)?,
            board_id: row.get(2)?,
            action: row.get(3)?,
            description: row.get(4)?,
            created_at: row.get(5)?,
        }),
    ).map_err(|e| format!("Activity not found: {}", e))
}

pub fn delete_by_card(conn: &Connection, card_id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM activities WHERE card_id = ?1", params![card_id])
        .map_err(|e| format!("Failed to delete card activities: {}", e))?;
    Ok(())
}
