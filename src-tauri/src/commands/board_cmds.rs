use tauri::State;
use crate::db::Database;
use crate::db::boards;
use crate::models::{Board, CreateBoardRequest, UpdateBoardRequest};

#[tauri::command]
pub fn create_board(db: State<Database>, project_id: String, name: String) -> Result<Board, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = CreateBoardRequest { project_id, name };
    boards::create(&conn, &req)
}

#[tauri::command]
pub fn get_boards_by_project(db: State<Database>, project_id: String) -> Result<Vec<Board>, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    boards::get_by_project(&conn, &project_id)
}

#[tauri::command]
pub fn get_board(db: State<Database>, id: String) -> Result<Board, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    boards::get_by_id(&conn, &id)
}

#[tauri::command]
pub fn update_board(db: State<Database>, id: String, name: Option<String>) -> Result<Board, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = UpdateBoardRequest { id, name };
    boards::update(&conn, &req)
}

#[tauri::command]
pub fn delete_board(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    boards::delete(&conn, &id)
}

#[tauri::command]
pub fn reorder_boards(db: State<Database>, ids: Vec<String>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    boards::reorder(&conn, &ids)
}
