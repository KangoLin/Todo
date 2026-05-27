use tauri::State;
use crate::db::Database;
use crate::db::search;
use crate::models::SearchResult;

#[tauri::command]
pub fn search_cards(db: State<Database>, query: String, project_id: Option<String>) -> Result<Vec<SearchResult>, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    search::search(&conn, &query, project_id.as_deref())
}
