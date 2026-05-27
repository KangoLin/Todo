use tauri::State;
use crate::db::Database;
use crate::models::{ExportData, CardTagLink};
use std::fs;

#[tauri::command]
pub fn export_data(db: State<Database>, path: String) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let projects = crate::db::projects::get_all(&conn)?;
    let boards = crate::db::boards::get_all(&conn)?;
    let columns = crate::db::columns::get_all(&conn)?;
    let cards = crate::db::cards::get_all(&conn)?;
    let subtasks = crate::db::subtasks::get_all(&conn)?;
    let tags = crate::db::tags::get_all(&conn)?;
    let card_tag_rows: Vec<(String, String)> = {
        let mut stmt = conn.prepare("SELECT card_id, tag_id FROM card_tags ORDER BY card_id")
            .map_err(|e| format!("Failed to query card_tags: {}", e))?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }).map_err(|e| format!("Failed to map card_tags: {}", e))?;
        rows.filter_map(|r| r.ok()).collect()
    };
    let card_tags: Vec<CardTagLink> = card_tag_rows.into_iter()
        .map(|(card_id, tag_id)| CardTagLink { card_id, tag_id })
        .collect();

    let data = ExportData {
        version: 1,
        projects,
        boards,
        columns,
        cards,
        subtasks,
        tags,
        card_tags,
    };

    let json = serde_json::to_string_pretty(&data).map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(&path, &json).map_err(|e| format!("Failed to write file: {}", e))?;
    let count = data.projects.len() + data.boards.len() + data.columns.len() + data.cards.len();
    Ok(format!("导出成功：{} 条记录 → {}", count, path))
}

#[tauri::command]
pub fn import_data(db: State<Database>, path: String) -> Result<String, String> {
    let json = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let export: ExportData = serde_json::from_str(&json)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    let conn = db.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    conn.execute_batch("PRAGMA defer_foreign_keys = ON")
        .map_err(|e| format!("Failed to set pragma: {}", e))?;

    for p in &export.projects {
        conn.execute(
            "INSERT OR REPLACE INTO projects (id, name, description, color, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![p.id, p.name, p.description, p.color, p.sort_order, p.created_at, p.updated_at],
        ).map_err(|e| format!("Failed to insert project: {}", e))?;
    }

    for b in &export.boards {
        conn.execute(
            "INSERT OR REPLACE INTO boards (id, project_id, name, description, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![b.id, b.project_id, b.name, b.description, b.sort_order, b.created_at, b.updated_at],
        ).map_err(|e| format!("Failed to insert board: {}", e))?;
    }

    for c in &export.columns {
        conn.execute(
            "INSERT OR REPLACE INTO columns (id, board_id, name, color, sort_order, wip_limit, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![c.id, c.board_id, c.name, c.color, c.sort_order, c.wip_limit, c.created_at],
        ).map_err(|e| format!("Failed to insert column: {}", e))?;
    }

    for c in &export.cards {
        conn.execute(
            "INSERT OR REPLACE INTO cards (id, column_id, title, description, sort_order, priority, due_date, cover_color, is_archived, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![c.id, c.column_id, c.title, c.description, c.sort_order, c.priority, c.due_date, c.cover_color, c.is_archived, c.created_at, c.updated_at],
        ).map_err(|e| format!("Failed to insert card: {}", e))?;
    }

    for s in &export.subtasks {
        conn.execute(
            "INSERT OR REPLACE INTO subtasks (id, card_id, title, is_done, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![s.id, s.card_id, s.title, s.is_done, s.sort_order, s.created_at],
        ).map_err(|e| format!("Failed to insert subtask: {}", e))?;
    }

    for t in &export.tags {
        conn.execute(
            "INSERT OR REPLACE INTO tags (id, board_id, name, color, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![t.id, t.board_id, t.name, t.color, t.created_at],
        ).map_err(|e| format!("Failed to insert tag: {}", e))?;
    }

    for ct in &export.card_tags {
        conn.execute(
            "INSERT OR REPLACE INTO card_tags (card_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![ct.card_id, ct.tag_id],
        ).map_err(|e| format!("Failed to insert card_tag: {}", e))?;
    }

    let msg = format!("导入完成：{} 个项目，{} 个看板，{} 个列，{} 个卡片，{} 个子任务",
        export.projects.len(), export.boards.len(), export.columns.len(),
        export.cards.len(), export.subtasks.len());
    Ok(msg)
}
