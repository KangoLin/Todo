use tauri::State;
use crate::db::Database;
use crate::db::projects;
use crate::models::{Project, CreateProjectRequest, UpdateProjectRequest};

#[tauri::command]
pub fn create_project(db: State<Database>, name: String, description: Option<String>, color: Option<String>) -> Result<Project, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = CreateProjectRequest { name, description, color };
    projects::create(&conn, &req)
}

#[tauri::command]
pub fn get_all_projects(db: State<Database>) -> Result<Vec<Project>, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    projects::get_all(&conn)
}

#[tauri::command]
pub fn get_project(db: State<Database>, id: String) -> Result<Project, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    projects::get_by_id(&conn, &id)
}

#[tauri::command]
pub fn update_project(db: State<Database>, id: String, name: Option<String>, description: Option<String>, color: Option<String>) -> Result<Project, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let req = UpdateProjectRequest { id, name, description, color };
    projects::update(&conn, &req)
}

#[tauri::command]
pub fn delete_project(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    projects::delete(&conn, &id)
}
