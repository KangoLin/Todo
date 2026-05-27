use tauri::State;
use crate::db::Database;
use crate::db::cards;
use crate::models::{Card, CardDetail, CreateCardRequest, UpdateCardRequest, MoveCardRequest, MoveCardWithinColumnRequest};

#[tauri::command]
pub fn create_card(db: State<Database>, column_id: String, title: String) -> Result<Card, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = CreateCardRequest { column_id, title };
    cards::create(&conn, &req)
}

#[tauri::command]
pub fn get_cards_by_column(db: State<Database>, column_id: String) -> Result<Vec<Card>, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    cards::get_by_column(&conn, &column_id)
}

#[tauri::command]
pub fn get_card(db: State<Database>, id: String) -> Result<CardDetail, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    cards::get_card_detail(&conn, &id)
}

#[tauri::command]
pub fn update_card(
    db: State<Database>, id: String,
    title: Option<String>, description: Option<String>,
    priority: Option<i32>, due_date: Option<String>, cover_color: Option<String>,
) -> Result<Card, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = UpdateCardRequest { id, title, description, priority, due_date, cover_color };
    cards::update(&conn, &req)
}

#[tauri::command]
pub fn move_card(db: State<Database>, card_id: String, target_column_id: String, target_sort_order: i32) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = MoveCardRequest { card_id, target_column_id, target_sort_order };
    cards::move_card(&conn, &req)
}

#[tauri::command]
pub fn move_card_within_column(db: State<Database>, card_id: String, target_sort_order: i32) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = MoveCardWithinColumnRequest { card_id, target_sort_order };
    cards::move_within_column(&conn, &req)
}

#[tauri::command]
pub fn archive_card(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    cards::archive(&conn, &id)
}

#[tauri::command]
pub fn delete_card(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    cards::delete(&conn, &id)
}
