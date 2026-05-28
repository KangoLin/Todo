use tauri::State;
use crate::db::Database;
use crate::db::activities;
use crate::models::Activity;

#[tauri::command]
pub fn get_activities_by_board(db: State<Database>, board_id: String) -> Result<Vec<Activity>, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    activities::get_by_board(&conn, &board_id, 50)
}
