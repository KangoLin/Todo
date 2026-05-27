use rusqlite::{Connection, params};
use crate::models::{Project, CreateProjectRequest, UpdateProjectRequest};

pub fn create(conn: &Connection, req: &CreateProjectRequest) -> Result<Project, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let color = req.color.clone().unwrap_or_else(|| "#6366f1".to_string());
    conn.execute(
        "INSERT INTO projects (id, name, description, color) VALUES (?1, ?2, ?3, ?4)",
        params![id, req.name, req.description.as_deref().unwrap_or(""), color],
    ).map_err(|e| format!("Failed to create project: {}", e))?;
    get_by_id(conn, &id)
}

pub fn get_all(conn: &Connection) -> Result<Vec<Project>, String> {
    let mut stmt = conn.prepare("SELECT id, name, description, color, sort_order, created_at, updated_at FROM projects ORDER BY sort_order, created_at")
        .map_err(|e| format!("Failed to query projects: {}", e))?;
    let projects = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            color: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to map projects: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(projects)
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Project, String> {
    conn.query_row(
        "SELECT id, name, description, color, sort_order, created_at, updated_at FROM projects WHERE id = ?1",
        params![id],
        |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                color: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    ).map_err(|e| format!("Project not found: {}", e))
}

pub fn update(conn: &Connection, req: &UpdateProjectRequest) -> Result<Project, String> {
    let existing = get_by_id(conn, &req.id)?;
    let name = req.name.clone().unwrap_or(existing.name);
    let description = req.description.clone().unwrap_or(existing.description);
    let color = req.color.clone().unwrap_or(existing.color);
    conn.execute(
        "UPDATE projects SET name = ?1, description = ?2, color = ?3, updated_at = datetime('now') WHERE id = ?4",
        params![name, description, color, req.id],
    ).map_err(|e| format!("Failed to update project: {}", e))?;
    get_by_id(conn, &req.id)
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete project: {}", e))?;
    Ok(())
}
