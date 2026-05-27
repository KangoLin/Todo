use tauri::State;
use crate::db::Database;
use crate::db::columns;
use crate::models::{Column, CreateColumnRequest, UpdateColumnRequest};

#[tauri::command]
pub fn create_column(db: State<Database>, board_id: String, name: String, sort_order: Option<i32>) -> Result<Column, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = CreateColumnRequest { board_id, name, sort_order };
    columns::create(&conn, &req)
}

#[tauri::command]
pub fn get_columns_by_board(db: State<Database>, board_id: String) -> Result<Vec<Column>, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    columns::get_by_board(&conn, &board_id)
}

#[tauri::command]
pub fn update_column(db: State<Database>, id: String, name: Option<String>, wip_limit: Option<i32>) -> Result<Column, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = UpdateColumnRequest { id, name, wip_limit };
    columns::update(&conn, &req)
}

#[tauri::command]
pub fn delete_column(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    columns::delete(&conn, &id)
}

#[tauri::command]
pub fn reorder_columns(db: State<Database>, ids: Vec<String>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    columns::reorder(&conn, &ids)
}
