use tauri::State;
use crate::db::Database;
use crate::db::comments;
use crate::db::cards;
use crate::db::activities;
use crate::models::Comment;

#[tauri::command]
pub fn create_comment(db: State<Database>, card_id: String, content: String) -> Result<Comment, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let board_id = cards::get_board_id(&conn, &card_id)?;
    let comment = comments::create(&conn, &card_id, &content)?;
    let _ = activities::create(&conn, &board_id, Some(&card_id), "comment_added", &format!("添加了评论"));
    Ok(comment)
}

#[tauri::command]
pub fn get_comments_by_card(db: State<Database>, card_id: String) -> Result<Vec<Comment>, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    comments::get_by_card(&conn, &card_id)
}

#[tauri::command]
pub fn delete_comment(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    comments::delete(&conn, &id)
}
