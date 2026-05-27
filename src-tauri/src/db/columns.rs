use rusqlite::{Connection, params};
use crate::models::{Column, CreateColumnRequest, UpdateColumnRequest};

pub fn create(conn: &Connection, req: &CreateColumnRequest) -> Result<Column, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let sort_order = req.sort_order.unwrap_or_else(|| {
        conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM columns WHERE board_id = ?1",
            params![req.board_id],
            |row| row.get(0),
        ).unwrap_or(0)
    });
    conn.execute(
        "INSERT INTO columns (id, board_id, name, sort_order) VALUES (?1, ?2, ?3, ?4)",
        params![id, req.board_id, req.name, sort_order],
    ).map_err(|e| format!("Failed to create column: {}", e))?;
    get_by_id(conn, &id)
}

pub fn get_by_board(conn: &Connection, board_id: &str) -> Result<Vec<Column>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, board_id, name, sort_order, wip_limit, color, created_at FROM columns WHERE board_id = ?1 ORDER BY sort_order, created_at"
    ).map_err(|e| format!("Failed to query columns: {}", e))?;
    let columns = stmt.query_map(params![board_id], |row| {
        Ok(Column {
            id: row.get(0)?,
            board_id: row.get(1)?,
            name: row.get(2)?,
            sort_order: row.get(3)?,
            wip_limit: row.get(4)?,
            color: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to map columns: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(columns)
}

pub fn get_by_id(conn: &Connection, id: &str) -> Result<Column, String> {
    conn.query_row(
        "SELECT id, board_id, name, sort_order, wip_limit, color, created_at FROM columns WHERE id = ?1",
        params![id],
        |row| {
            Ok(Column {
                id: row.get(0)?,
                board_id: row.get(1)?,
                name: row.get(2)?,
                sort_order: row.get(3)?,
                wip_limit: row.get(4)?,
                color: row.get(5)?,
                created_at: row.get(6)?,
            })
        },
    ).map_err(|e| format!("Column not found: {}", e))
}

pub fn update(conn: &Connection, req: &UpdateColumnRequest) -> Result<Column, String> {
    let existing = get_by_id(conn, &req.id)?;
    let name = req.name.clone().unwrap_or(existing.name);
    conn.execute(
        "UPDATE columns SET name = ?1, wip_limit = ?2 WHERE id = ?3",
        params![name, req.wip_limit, req.id],
    ).map_err(|e| format!("Failed to update column: {}", e))?;
    get_by_id(conn, &req.id)
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM columns WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete column: {}", e))?;
    Ok(())
}

pub fn reorder(conn: &Connection, ids: &[String]) -> Result<(), String> {
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE columns SET sort_order = ?1 WHERE id = ?2",
            params![i as i32, id],
        ).map_err(|e| format!("Failed to reorder column: {}", e))?;
    }
    Ok(())
}

pub fn get_all(conn: &Connection) -> Result<Vec<Column>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, board_id, name, sort_order, wip_limit, color, created_at FROM columns ORDER BY sort_order, created_at"
    ).map_err(|e| format!("Failed to query columns: {}", e))?;
    let columns = stmt.query_map([], |row| {
        Ok(Column {
            id: row.get(0)?,
            board_id: row.get(1)?,
            name: row.get(2)?,
            sort_order: row.get(3)?,
            wip_limit: row.get(4)?,
            color: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to map columns: {}", e))?
    .filter_map(|r| r.ok())
    .collect();
    Ok(columns)
}
