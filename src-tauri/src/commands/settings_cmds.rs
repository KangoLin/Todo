use tauri::State;
use rusqlite::params;
use crate::db::Database;

#[derive(serde::Serialize)]
pub struct DbStats {
    pub project_count: i32,
    pub board_count: i32,
    pub card_count: i32,
}

#[tauri::command]
pub fn get_setting(db: State<Database>, key: String) -> Result<Option<String>, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    );
    match result {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Settings query error: {}", e)),
    }
}

#[tauri::command]
pub fn set_setting(db: State<Database>, key: String, value: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    ).map_err(|e| format!("Failed to set setting: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_db_stats(db: State<Database>) -> Result<DbStats, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let project_count = conn.query_row("SELECT COUNT(*) FROM projects", [], |r| r.get(0)).unwrap_or(0);
    let board_count = conn.query_row("SELECT COUNT(*) FROM boards", [], |r| r.get(0)).unwrap_or(0);
    let card_count = conn.query_row("SELECT COUNT(*) FROM cards WHERE is_archived = 0", [], |r| r.get(0)).unwrap_or(0);
    Ok(DbStats { project_count, board_count, card_count })
}
