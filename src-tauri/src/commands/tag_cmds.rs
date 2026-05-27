use tauri::State;
use crate::db::Database;
use crate::db::tags;
use crate::models::{Tag, CreateTagRequest, CardTagRequest};

#[tauri::command]
pub fn create_tag(db: State<Database>, board_id: String, name: String, color: Option<String>) -> Result<Tag, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = CreateTagRequest { board_id, name, color };
    tags::create(&conn, &req)
}

#[tauri::command]
pub fn get_tags_by_board(db: State<Database>, board_id: String) -> Result<Vec<Tag>, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    tags::get_by_board(&conn, &board_id)
}

#[tauri::command]
pub fn delete_tag(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    tags::delete(&conn, &id)
}

#[tauri::command]
pub fn add_tag_to_card(db: State<Database>, card_id: String, tag_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = CardTagRequest { card_id, tag_id };
    tags::add_to_card(&conn, &req)
}

#[tauri::command]
pub fn remove_tag_from_card(db: State<Database>, card_id: String, tag_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = CardTagRequest { card_id, tag_id };
    tags::remove_from_card(&conn, &req)
}

#[tauri::command]
pub fn get_tags_by_card(db: State<Database>, card_id: String) -> Result<Vec<Tag>, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    tags::get_by_card(&conn, &card_id)
}
