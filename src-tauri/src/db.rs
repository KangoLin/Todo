use rusqlite::{Connection, params};
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Subtask {
    pub id: String,
    pub text: String,
    pub done: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Item {
    pub id: String,
    pub card_id: String,
    pub text: String,
    pub description: String,
    pub start: String,
    pub end: String,
    pub done: bool,
    pub priority: String,
    pub tags: Vec<Tag>,
    pub subtasks: Vec<Subtask>,
    pub repeat: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Card {
    pub id: String,
    pub title: String,
    pub collapsed: bool,
    pub folded: bool,
    pub date: Option<String>,
    pub items: Vec<Item>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: String,
    pub sort_order: i32,
}

pub struct Database {
    pub conn: Mutex<Connection>,
    pub db_path: String,
}

impl Database {
    pub fn new(db_path: &str) -> Result<Self, String> {
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA foreign_keys = ON")
            .map_err(|e| e.to_string())?;
        let db = Self { conn: Mutex::new(conn), db_path: db_path.to_string() };
        db.init()?;
        Ok(db)
    }

    fn init(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL DEFAULT '',
                color TEXT NOT NULL DEFAULT '#3d7ae0',
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL DEFAULT '',
                title TEXT NOT NULL DEFAULT '',
                collapsed INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS items (
                id TEXT PRIMARY KEY,
                card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
                text TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                start_time TEXT NOT NULL DEFAULT '',
                end_time TEXT NOT NULL DEFAULT '',
                done INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0
            );
        ").map_err(|e| e.to_string())?;

        conn.execute_batch("ALTER TABLE cards ADD COLUMN date TEXT").ok();
        conn.execute_batch("ALTER TABLE cards ADD COLUMN folded INTEGER NOT NULL DEFAULT 0").ok();
        conn.execute_batch("UPDATE cards SET collapsed = 0, folded = 1 WHERE collapsed = 1 AND folded = 0").ok();
        conn.execute_batch("ALTER TABLE items ADD COLUMN description TEXT NOT NULL DEFAULT ''").ok();
        conn.execute_batch("ALTER TABLE items ADD COLUMN priority TEXT NOT NULL DEFAULT 'none'").ok();
        conn.execute_batch("ALTER TABLE items ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'").ok();
        conn.execute_batch("ALTER TABLE items ADD COLUMN subtasks TEXT NOT NULL DEFAULT '[]'").ok();
        conn.execute_batch("ALTER TABLE cards ADD COLUMN project_id TEXT NOT NULL DEFAULT ''").ok();
        conn.execute_batch("ALTER TABLE items ADD COLUMN repeat TEXT NOT NULL DEFAULT 'none'").ok();
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS pomodoro_sessions (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL DEFAULT '',
                duration_minutes INTEGER NOT NULL DEFAULT 25,
                started_at TEXT NOT NULL DEFAULT (datetime('now')),
                completed_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        ").ok();

        // ensure a default project exists
        let project_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM projects", [], |row| row.get(0)
        ).unwrap_or(0);
        if project_count == 0 {
            let default_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO projects (id, name, color, sort_order) VALUES (?1, '默认项目', '#3d7ae0', 0)",
                params![default_id],
            ).ok();
            conn.execute("UPDATE cards SET project_id = ?1 WHERE project_id = ''", params![default_id]).ok();
        }
        conn.execute_batch("
            CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
                text, description, content='items', content_rowid='rowid', tokenize='unicode61'
            );
        ").ok();
        conn.execute_batch("
            CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
                INSERT INTO items_fts(rowid, text, description) VALUES (new.rowid, new.text, new.description);
            END;
        ").ok();
        conn.execute_batch("
            CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
                INSERT INTO items_fts(items_fts, rowid, text, description) VALUES ('delete', old.rowid, old.text, old.description);
            END;
        ").ok();
        conn.execute_batch("
            CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
                INSERT INTO items_fts(items_fts, rowid, text, description) VALUES ('delete', old.rowid, old.text, old.description);
                INSERT INTO items_fts(rowid, text, description) VALUES (new.rowid, new.text, new.description);
            END;
        ").ok();
        conn.execute_batch("INSERT INTO items_fts(items_fts) VALUES('rebuild')").ok();

        Ok(())
    }
}

// ── Project commands ──

#[tauri::command]
pub fn get_projects(db: tauri::State<'_, Database>) -> Result<Vec<Project>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, name, color, sort_order FROM projects ORDER BY sort_order"
    ).map_err(|e| e.to_string())?;
    let projects = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            sort_order: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(projects)
}

#[tauri::command]
pub fn create_project(db: tauri::State<'_, Database>, name: String, color: String) -> Result<Project, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM projects", [], |row| row.get(0)
    ).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO projects (id, name, color, sort_order) VALUES (?1, ?2, ?3, ?4)",
        params![id, name, color, max_order + 1],
    ).map_err(|e| e.to_string())?;
    Ok(Project { id, name, color, sort_order: max_order + 1 })
}

#[tauri::command]
pub fn update_project(db: tauri::State<'_, Database>, id: String, name: Option<String>, color: Option<String>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    if let Some(ref n) = name {
        conn.execute("UPDATE projects SET name = ?1 WHERE id = ?2", params![n, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref c) = color {
        conn.execute("UPDATE projects SET color = ?1 WHERE id = ?2", params![c, id])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_project(db: tauri::State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM items WHERE card_id IN (SELECT id FROM cards WHERE project_id = ?1)", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM cards WHERE project_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_projects(db: tauri::State<'_, Database>, ids: Vec<String>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    for (i, id) in ids.iter().enumerate() {
        conn.execute("UPDATE projects SET sort_order = ?1 WHERE id = ?2", params![i as i32, id])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Card commands ──

#[tauri::command]
pub fn get_cards(db: tauri::State<'_, Database>, project_id: Option<String>) -> Result<Vec<Card>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let card_sql = if project_id.is_some() {
        "SELECT id, title, collapsed, folded, date FROM cards WHERE project_id = ?1 ORDER BY sort_order"
    } else {
        "SELECT id, title, collapsed, folded, date FROM cards ORDER BY sort_order"
    };

    let mut card_stmt = conn.prepare(card_sql).map_err(|e| e.to_string())?;

    let card_rows: Vec<(String, String, bool, bool, Option<String>)> = if let Some(ref pid) = project_id {
        card_stmt.query_map(params![pid], |row| {
            let collapsed_int: i32 = row.get(2)?;
            let folded_int: i32 = row.get(3)?;
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, collapsed_int != 0, folded_int != 0, row.get::<_, Option<String>>(4)?))
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    } else {
        card_stmt.query_map([], |row| {
            let collapsed_int: i32 = row.get(2)?;
            let folded_int: i32 = row.get(3)?;
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, collapsed_int != 0, folded_int != 0, row.get::<_, Option<String>>(4)?))
        }).map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
    };

    drop(card_stmt);

    let mut item_stmt = conn.prepare(
        "SELECT id, card_id, text, description, start_time, end_time, done, priority, tags, subtasks, repeat FROM items ORDER BY sort_order"
    ).map_err(|e| e.to_string())?;

    let items: Vec<Item> = item_stmt.query_map([], |row| {
        let done_int: i32 = row.get(6)?;
        let tags_str: String = row.get(8)?;
        let subtasks_str: String = row.get(9)?;
        Ok(Item {
            id: row.get(0)?,
            card_id: row.get(1)?,
            text: row.get(2)?,
            description: row.get(3)?,
            start: row.get(4)?,
            end: row.get(5)?,
            done: done_int != 0,
            priority: row.get(7)?,
            tags: serde_json::from_str(&tags_str).unwrap_or_default(),
            subtasks: serde_json::from_str(&subtasks_str).unwrap_or_default(),
            repeat: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    drop(item_stmt);

    let mut result: Vec<Card> = card_rows.into_iter().map(|(id, title, collapsed, folded, date)| {
        Card { id: id.clone(), title, collapsed, folded, date, items: Vec::new() }
    }).collect();

    for card in &mut result {
        card.items = items.iter()
            .filter(|i| i.card_id == card.id)
            .cloned()
            .collect();
    }

    Ok(result)
}

#[tauri::command]
pub fn create_card(db: tauri::State<'_, Database>, project_id: Option<String>) -> Result<Card, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM cards", [], |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    let pid = project_id.unwrap_or_default();
    conn.execute(
        "INSERT INTO cards (id, project_id, title, collapsed, sort_order) VALUES (?1, ?2, '', 0, ?3)",
        params![id, pid, max_order + 1],
    ).map_err(|e| e.to_string())?;

    let item_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO items (id, card_id, text, description, start_time, end_time, done, sort_order) VALUES (?1, ?2, '', '', '', '', 0, 0)",
        params![item_id, id],
    ).map_err(|e| e.to_string())?;

    Ok(Card {
        id: id.clone(),
        title: String::new(),
            collapsed: false,
            folded: false,
        date: None,
        items: vec![Item {
            id: item_id,
            card_id: id,
            text: String::new(),
            description: String::new(),
            start: String::new(),
            end: String::new(),
            done: false,
            priority: "none".to_string(),
            tags: Vec::new(),
            subtasks: Vec::new(),
            repeat: "none".to_string(),
        }],
    })
}

#[tauri::command]
pub fn update_card(db: tauri::State<'_, Database>, id: String, title: Option<String>, collapsed: Option<bool>, folded: Option<bool>, date: Option<Option<String>>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    if let Some(ref t) = title {
        conn.execute(
            "UPDATE cards SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![t, id],
        ).map_err(|e| e.to_string())?;
    }

    if let Some(c) = collapsed {
        conn.execute(
            "UPDATE cards SET collapsed = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![c as i32, id],
        ).map_err(|e| e.to_string())?;
    }

    if let Some(f) = folded {
        conn.execute(
            "UPDATE cards SET folded = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![f as i32, id],
        ).map_err(|e| e.to_string())?;
    }

    if let Some(d) = date {
        conn.execute(
            "UPDATE cards SET date = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![d, id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_card(db: tauri::State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM items WHERE card_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM cards WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_cards(db: tauri::State<'_, Database>, ids: Vec<String>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE cards SET sort_order = ?1 WHERE id = ?2",
            params![i as i32, id],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn create_item(db: tauri::State<'_, Database>, card_id: String, text: Option<String>, description: Option<String>, start: Option<String>, end: Option<String>, done: Option<bool>, priority: Option<String>, tags: Option<Vec<Tag>>, subtasks: Option<Vec<Subtask>>, repeat: Option<String>) -> Result<Item, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM items WHERE card_id = ?1",
        params![card_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let text = text.unwrap_or_default();
    let description = description.unwrap_or_default();
    let start = start.unwrap_or_default();
    let end = end.unwrap_or_default();
    let done = done.unwrap_or(false);
    let priority = priority.unwrap_or_else(|| "none".to_string());
    let tags = tags.unwrap_or_default();
    let subtasks = subtasks.unwrap_or_default();
    let repeat = repeat.unwrap_or_else(|| "none".to_string());
    let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string());
    let subtasks_json = serde_json::to_string(&subtasks).unwrap_or_else(|_| "[]".to_string());

    conn.execute(
        "INSERT INTO items (id, card_id, text, description, start_time, end_time, done, sort_order, priority, tags, subtasks, repeat) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![id, card_id, text, description, start, end, done as i32, max_order + 1, priority, tags_json, subtasks_json, repeat],
    ).map_err(|e| e.to_string())?;

    Ok(Item {
        id,
        card_id,
        text,
        description,
        start,
        end,
        done,
        priority,
        tags,
        subtasks,
        repeat,
    })
}

#[tauri::command]
pub fn move_item(db: tauri::State<'_, Database>, id: String, target_card_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE items SET card_id = ?1 WHERE id = ?2",
        params![target_card_id, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_item(db: tauri::State<'_, Database>, id: String, text: Option<String>, description: Option<String>, start: Option<String>, end: Option<String>, done: Option<bool>, priority: Option<String>, tags: Option<Vec<Tag>>, subtasks: Option<Vec<Subtask>>, repeat: Option<String>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    if let Some(ref t) = text {
        conn.execute("UPDATE items SET text = ?1 WHERE id = ?2", params![t, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref desc) = description {
        conn.execute("UPDATE items SET description = ?1 WHERE id = ?2", params![desc, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref s) = start {
        conn.execute("UPDATE items SET start_time = ?1 WHERE id = ?2", params![s, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref e) = end {
        conn.execute("UPDATE items SET end_time = ?1 WHERE id = ?2", params![e, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(d) = done {
        conn.execute("UPDATE items SET done = ?1 WHERE id = ?2", params![d as i32, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref p) = priority {
        conn.execute("UPDATE items SET priority = ?1 WHERE id = ?2", params![p, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref t) = tags {
        let json = serde_json::to_string(t).map_err(|e| e.to_string())?;
        conn.execute("UPDATE items SET tags = ?1 WHERE id = ?2", params![json, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref s) = subtasks {
        let json = serde_json::to_string(s).map_err(|e| e.to_string())?;
        conn.execute("UPDATE items SET subtasks = ?1 WHERE id = ?2", params![json, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref r) = repeat {
        conn.execute("UPDATE items SET repeat = ?1 WHERE id = ?2", params![r, id])
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn create_repeat_item(db: tauri::State<'_, Database>, id: String) -> Result<Option<Item>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let original: Item = conn.query_row(
        "SELECT id, card_id, text, description, start_time, end_time, priority, tags, subtasks, repeat FROM items WHERE id = ?1",
        params![id],
        |row| {
            let tags_str: String = row.get(7)?;
            let subtasks_str: String = row.get(8)?;
            Ok(Item {
                id: row.get(0)?,
                card_id: row.get(1)?,
                text: row.get(2)?,
                description: row.get(3)?,
                start: row.get(4)?,
                end: row.get(5)?,
                done: false,
                priority: row.get(6)?,
                tags: serde_json::from_str(&tags_str).unwrap_or_default(),
                subtasks: serde_json::from_str(&subtasks_str).unwrap_or_default(),
                repeat: row.get(9)?,
            })
        }
    ).map_err(|e| e.to_string())?;

    if original.repeat == "none" {
        return Ok(None);
    }

    let new_id = Uuid::new_v4().to_string();
    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM items WHERE card_id = ?1",
        params![original.card_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let tags_json = serde_json::to_string(&original.tags).unwrap_or_else(|_| "[]".to_string());
    let subtasks_json = serde_json::to_string(&original.subtasks).unwrap_or_else(|_| "[]".to_string());

    conn.execute(
        "INSERT INTO items (id, card_id, text, description, start_time, end_time, done, sort_order, priority, tags, subtasks, repeat) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, ?9, ?10, ?11)",
        params![new_id, original.card_id, original.text, original.description, original.start, original.end, max_order + 1, original.priority, tags_json, subtasks_json, original.repeat],
    ).map_err(|e| e.to_string())?;

    Ok(Some(Item {
        id: new_id,
        card_id: original.card_id,
        text: original.text,
        description: original.description,
        start: original.start,
        end: original.end,
        done: false,
        priority: original.priority,
        tags: original.tags,
        subtasks: original.subtasks,
        repeat: original.repeat,
    }))
}

#[tauri::command]
pub fn delete_item(db: tauri::State<'_, Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM items WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reorder_items(db: tauri::State<'_, Database>, ids: Vec<String>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE items SET sort_order = ?1 WHERE id = ?2",
            params![i as i32, id],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub version: u32,
    pub exported_at: String,
    pub projects: Vec<Project>,
    pub cards: Vec<Card>,
}

#[tauri::command]
pub fn export_data(db: tauri::State<'_, Database>) -> Result<String, String> {
    let projects = get_projects(db.clone())?;
    let cards = get_cards(db, None)?;
    let data = ExportData {
        version: 2,
        exported_at: chrono::Utc::now().to_rfc3339(),
        projects,
        cards,
    };
    serde_json::to_string_pretty(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_data(db: tauri::State<'_, Database>, json: String) -> Result<(), String> {
    let data: ExportData = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM items", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM cards", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects", []).map_err(|e| e.to_string())?;

    for (pi, project) in data.projects.iter().enumerate() {
        conn.execute(
            "INSERT INTO projects (id, name, color, sort_order) VALUES (?1, ?2, ?3, ?4)",
            params![project.id, project.name, project.color, pi as i32],
        ).map_err(|e| e.to_string())?;
    }

    for (ci, card) in data.cards.iter().enumerate() {
        let pid = if data.projects.is_empty() { "" } else { &data.projects[0].id };
        conn.execute(
            "INSERT INTO cards (id, project_id, title, collapsed, folded, date, sort_order) VALUES (?1, ?2, ?3, 0, 0, ?4, ?5)",
            params![card.id, pid, card.title, card.date, ci as i32],
        ).map_err(|e| e.to_string())?;

        for (ii, item) in card.items.iter().enumerate() {
            let tags_json = serde_json::to_string(&item.tags).unwrap_or_else(|_| "[]".to_string());
            let subtasks_json = serde_json::to_string(&item.subtasks).unwrap_or_else(|_| "[]".to_string());
            conn.execute(
                "INSERT INTO items (id, card_id, text, description, start_time, end_time, done, sort_order, priority, tags, subtasks, repeat) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![item.id, card.id, item.text, item.description, item.start, item.end, item.done as i32, ii as i32, item.priority, tags_json, subtasks_json, item.repeat],
            ).map_err(|e| e.to_string())?;
        }
    }

    conn.execute_batch("INSERT INTO items_fts(items_fts) VALUES('rebuild')").ok();

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub item_id: String,
    pub card_id: String,
    pub card_title: String,
    pub item_text: String,
    pub snippet: String,
}

#[tauri::command]
pub fn search_items(db: tauri::State<'_, Database>, query: String) -> Result<Vec<SearchResult>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("
        SELECT i.id, i.card_id, c.title, i.text,
               snippet(items_fts, 1, '<mark>', '</mark>', '...', 24)
        FROM items_fts
        JOIN items i ON items_fts.rowid = i.rowid
        JOIN cards c ON i.card_id = c.id
        WHERE items_fts MATCH ?1
        ORDER BY rank
        LIMIT 30
    ").map_err(|e| e.to_string())?;

    let results = stmt.query_map(params![query], |row| {
        Ok(SearchResult {
            item_id: row.get(0)?,
            card_id: row.get(1)?,
            card_title: row.get(2)?,
            item_text: row.get(3)?,
            snippet: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(results)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PomodoroStats {
    pub total_sessions: i64,
    pub total_minutes: i64,
    pub today_sessions: i64,
    pub today_minutes: i64,
}

#[tauri::command]
pub fn log_pomodoro(db: tauri::State<'_, Database>, item_id: String, duration_minutes: i32) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO pomodoro_sessions (id, item_id, duration_minutes) VALUES (?1, ?2, ?3)",
        params![id, item_id, duration_minutes],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_pomodoro_stats(db: tauri::State<'_, Database>) -> Result<PomodoroStats, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let total_sessions: i64 = conn.query_row("SELECT COUNT(*) FROM pomodoro_sessions", [], |row| row.get::<_, i64>(0))
        .map_err(|e| e.to_string())?;
    let total_minutes: i64 = conn.query_row(
        "SELECT COALESCE(SUM(duration_minutes), 0) FROM pomodoro_sessions",
        [], |row| row.get(0)
    ).map_err(|e| e.to_string())?;
    let today_sessions: i64 = conn.query_row(
        "SELECT COUNT(*) FROM pomodoro_sessions WHERE date(completed_at) = date('now')",
        [], |row| row.get(0)
    ).map_err(|e| e.to_string())?;
    let today_minutes: i64 = conn.query_row(
        "SELECT COALESCE(SUM(duration_minutes), 0) FROM pomodoro_sessions WHERE date(completed_at) = date('now')",
        [], |row| row.get(0)
    ).map_err(|e| e.to_string())?;
    Ok(PomodoroStats { total_sessions, total_minutes, today_sessions, today_minutes })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Statistics {
    pub total_items: i64,
    pub completed_items: i64,
    pub completion_rate: f64,
    pub total_minutes: i64,
    pub items_by_date: Vec<DateCount>,
    pub priority_distribution: Vec<LabelCount>,
    pub daily_stats: Vec<DailyStat>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DateCount {
    pub date: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LabelCount {
    pub label: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyStat {
    pub date: String,
    pub total: i64,
    pub completed: i64,
    pub minutes: i64,
}

#[tauri::command]
pub fn get_statistics(db: tauri::State<'_, Database>) -> Result<Statistics, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let total_items: i64 = conn.query_row("SELECT COUNT(*) FROM items", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let completed_items: i64 = conn.query_row("SELECT COUNT(*) FROM items WHERE done = 1", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let completion_rate = if total_items > 0 { completed_items as f64 / total_items as f64 * 100.0 } else { 0.0 };

    let total_minutes: i64 = conn.query_row(
        "SELECT COALESCE(SUM(
            CASE WHEN start_time != '' AND end_time != '' THEN
                (CAST(substr(end_time, 1, 2) AS INTEGER) * 60 + CAST(substr(end_time, 4, 2) AS INTEGER))
                - (CAST(substr(start_time, 1, 2) AS INTEGER) * 60 + CAST(substr(start_time, 4, 2) AS INTEGER))
            ELSE 0 END
        ), 0) FROM items WHERE done = 1",
        [], |row| row.get::<_, i64>(0)
    ).map_err(|e| e.to_string())?.max(0);

    let mut pstmt = conn.prepare("
        SELECT c.date, COUNT(*) FROM items i JOIN cards c ON i.card_id = c.id
        WHERE c.date IS NOT NULL GROUP BY c.date ORDER BY c.date
    ").map_err(|e| e.to_string())?;
    let items_by_date = pstmt.query_map([], |row| {
        Ok(DateCount { date: row.get(0)?, count: row.get(1)? })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let mut ppstmt = conn.prepare("
        SELECT priority, COUNT(*) FROM items GROUP BY priority ORDER BY CASE priority
            WHEN 'p0' THEN 0 WHEN 'p1' THEN 1 WHEN 'p2' THEN 2 WHEN 'p3' THEN 3 ELSE 4 END
    ").map_err(|e| e.to_string())?;
    let priority_distribution = ppstmt.query_map([], |row| {
        Ok(LabelCount { label: row.get(0)?, count: row.get(1)? })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let mut dstmt = conn.prepare("
        SELECT COALESCE(c.date, '无日期') as grp,
               COUNT(*) as total,
               SUM(CASE WHEN i.done THEN 1 ELSE 0 END) as completed,
               COALESCE(SUM(
                   CASE WHEN i.start_time != '' AND i.end_time != '' THEN
                       (CAST(substr(i.end_time, 1, 2) AS INTEGER) * 60 + CAST(substr(i.end_time, 4, 2) AS INTEGER))
                       - (CAST(substr(i.start_time, 1, 2) AS INTEGER) * 60 + CAST(substr(i.start_time, 4, 2) AS INTEGER))
                   ELSE 0 END
               ), 0) as minutes
        FROM items i JOIN cards c ON i.card_id = c.id
        WHERE c.date IS NOT NULL
        GROUP BY grp ORDER BY c.date DESC LIMIT 30
    ").map_err(|e| e.to_string())?;
    let daily_stats = dstmt.query_map([], |row| {
        Ok(DailyStat {
            date: row.get(0)?,
            total: row.get(1)?,
            completed: row.get(2)?,
            minutes: row.get::<_, i64>(3)?.max(0),
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(Statistics {
        total_items,
        completed_items,
        completion_rate,
        total_minutes,
        items_by_date,
        priority_distribution,
        daily_stats,
    })
}

#[tauri::command]
pub fn manual_backup(db: tauri::State<'_, Database>) -> Result<String, String> {
    let src = &db.db_path;
    let backup_dir = std::path::Path::new(src).parent().unwrap().join("backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    let ts = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let dst = backup_dir.join(format!("todo_backup_{}.db", ts));
    std::fs::copy(src, &dst).map_err(|e| e.to_string())?;

    let mut backups: Vec<_> = std::fs::read_dir(&backup_dir).map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "db"))
        .collect();
    backups.sort_by_key(|e| e.path().metadata().ok().and_then(|m| m.modified().ok()));
    while backups.len() > 10 {
        if let Some(oldest) = backups.first() {
            std::fs::remove_file(oldest.path()).ok();
        }
        backups.remove(0);
    }

    Ok(dst.to_string_lossy().to_string())
}
