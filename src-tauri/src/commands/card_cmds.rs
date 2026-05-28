use tauri::State;
use crate::db::Database;
use crate::db::cards;
use crate::db::activities;
use crate::models::{Card, CardDetail, CreateCardRequest, UpdateCardRequest, MoveCardRequest, MoveCardWithinColumnRequest};

fn log_activity(conn: &rusqlite::Connection, board_id: &str, card_id: Option<&str>, action: &str, description: &str) {
    let _ = activities::create(conn, board_id, card_id, action, description);
}

#[tauri::command]
pub fn create_card(db: State<Database>, column_id: String, title: String) -> Result<Card, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let board_id = cards::get_board_id_by_column(&conn, &column_id)?;
    let card = cards::create(&conn, &CreateCardRequest { column_id, title: title.clone() })?;
    log_activity(&conn, &board_id, Some(&card.id), "card_created", &format!("创建了卡片「{}」", title));
    Ok(card)
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
    let board_id = cards::get_board_id(&conn, &card_id)?;
    let req = MoveCardRequest { card_id: card_id.clone(), target_column_id, target_sort_order };
    cards::move_card(&conn, &req)?;
    log_activity(&conn, &board_id, Some(&card_id), "card_moved", "移动了卡片");
    Ok(())
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
    let board_id = cards::get_board_id(&conn, &id)?;
    cards::archive(&conn, &id)?;
    log_activity(&conn, &board_id, Some(&id), "card_archived", "归档了卡片");
    Ok(())
}

#[tauri::command]
pub fn delete_card(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let board_id = cards::get_board_id(&conn, &id)?;
    cards::delete(&conn, &id)?;
    let _ = activities::delete_by_card(&conn, &id);
    log_activity(&conn, &board_id, None, "card_deleted", "删除了卡片");
    Ok(())
}

#[tauri::command]
pub fn restore_card(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let board_id = cards::get_board_id(&conn, &id)?;
    cards::restore(&conn, &id)?;
    log_activity(&conn, &board_id, Some(&id), "card_restored", "恢复了卡片");
    Ok(())
}

#[tauri::command]
pub fn get_archived_cards_by_board(db: State<Database>, board_id: String) -> Result<Vec<Card>, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    cards::get_archived_by_board(&conn, &board_id)
}

#[tauri::command]
pub fn copy_card_cmd(db: State<Database>, card_id: String, target_column_id: String) -> Result<Card, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let board_id = cards::get_board_id(&conn, &card_id)?;
    let card = cards::copy_card(&conn, &card_id, &target_column_id)?;
    log_activity(&conn, &board_id, Some(&card.id), "card_created", &format!("复制了卡片「{}」", card.title));
    Ok(card)
}
