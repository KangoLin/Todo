use rusqlite::{Connection, params};
use crate::models::{Board, CreateBoardRequest, UpdateBoardRequest};

pub fn create(conn: &Connection, req: &CreateBoardRequest) -> Result<Board, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM boards WHERE project_id = ?1",
        params![req.project_id],
        |row| row.get(0),
    ).unwrap_or(0);
    conn.execute(
        "INSERT INTO boards (id, project_id, name, sort_order) VALUES (?1, ?2, ?3, ?4)",
        params![id, req.project_id, req.name, max_order],
    ).map_err(|e| format!("Failed to create board: {}", e))?;
    get_by_id(conn, &id)
}

pub fn get_by_project(conn: &Connection, project_id: &str) -> Result<Vec<Board>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, name, description, sort_order, created_at, updated_at FROM boards WHERE project_id = ?1 ORDER BY sort_order, created_at"
    ).map_err(|e| format!("Failed to query boards: {}", e))?;
    let boards = stmt.query_map(params![project_id], |row| {
        Ok(Board {
            id: row.get(0)?,
            project_id: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to map boards: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(boards)
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Board, String> {
    conn.query_row(
        "SELECT id, project_id, name, description, sort_order, created_at, updated_at FROM boards WHERE id = ?1",
        params![id],
        |row| {
            Ok(Board {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    ).map_err(|e| format!("Board not found: {}", e))
}

pub fn update(conn: &Connection, req: &UpdateBoardRequest) -> Result<Board, String> {
    let existing = get_by_id(conn, &req.id)?;
    let name = req.name.clone().unwrap_or(existing.name);
    conn.execute(
        "UPDATE boards SET name = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![name, req.id],
    ).map_err(|e| format!("Failed to update board: {}", e))?;
    get_by_id(conn, &req.id)
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM boards WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete board: {}", e))?;
    Ok(())
}

pub fn reorder(conn: &Connection, ids: &[String]) -> Result<(), String> {
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE boards SET sort_order = ?1 WHERE id = ?2",
            params![i as i32, id],
        ).map_err(|e| format!("Failed to reorder board: {}", e))?;
    }
    Ok(())
}

pub fn get_all(conn: &Connection) -> Result<Vec<Board>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, name, description, sort_order, created_at, updated_at FROM boards ORDER BY sort_order, created_at"
    ).map_err(|e| format!("Failed to query boards: {}", e))?;
    let boards = stmt.query_map([], |row| {
        Ok(Board {
            id: row.get(0)?,
            project_id: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to map boards: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(boards)
}
