use tauri::State;
use crate::db::Database;
use crate::db::subtasks;
use crate::models::{Subtask, CreateSubtaskRequest};

#[tauri::command]
pub fn create_subtask(db: State<Database>, card_id: String, title: String) -> Result<Subtask, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = CreateSubtaskRequest { card_id, title };
    subtasks::create(&conn, &req)
}

#[tauri::command]
pub fn toggle_subtask(db: State<Database>, id: String) -> Result<Subtask, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    subtasks::toggle(&conn, &id)
}

#[tauri::command]
pub fn delete_subtask(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    subtasks::delete(&conn, &id)
}
