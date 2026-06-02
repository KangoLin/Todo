use rusqlite::{Connection, params};
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Item {
    pub id: String,
    pub card_id: String,
    pub text: String,
    pub start: String,
    pub end: String,
    pub done: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Card {
    pub id: String,
    pub title: String,
    pub collapsed: bool,
    pub date: Option<String>,
    pub items: Vec<Item>,
}

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: &str) -> Result<Self, String> {
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA foreign_keys = ON")
            .map_err(|e| e.to_string())?;
        let db = Self { conn: Mutex::new(conn) };
        db.init()?;
        Ok(db)
    }

    fn init(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
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
                start_time TEXT NOT NULL DEFAULT '',
                end_time TEXT NOT NULL DEFAULT '',
                done INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0
            );
        ").map_err(|e| e.to_string())?;

        conn.execute_batch("ALTER TABLE cards ADD COLUMN date TEXT").ok();

        Ok(())
    }
}

#[tauri::command]
pub fn get_cards(db: tauri::State<'_, Database>) -> Result<Vec<Card>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut card_stmt = conn.prepare(
        "SELECT id, title, collapsed, date FROM cards ORDER BY sort_order"
    ).map_err(|e| e.to_string())?;

    let cards: Vec<Card> = card_stmt.query_map([], |row| {
        let collapsed_int: i32 = row.get(2)?;
        Ok(Card {
            id: row.get(0)?,
            title: row.get(1)?,
            collapsed: collapsed_int != 0,
            date: row.get(3)?,
            items: Vec::new(),
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    drop(card_stmt);

    let mut item_stmt = conn.prepare(
        "SELECT id, card_id, text, start_time, end_time, done FROM items ORDER BY sort_order"
    ).map_err(|e| e.to_string())?;

    let items: Vec<Item> = item_stmt.query_map([], |row| {
        let done_int: i32 = row.get(5)?;
        Ok(Item {
            id: row.get(0)?,
            card_id: row.get(1)?,
            text: row.get(2)?,
            start: row.get(3)?,
            end: row.get(4)?,
            done: done_int != 0,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    drop(item_stmt);

    let mut result = cards;
    for card in &mut result {
        card.items = items.iter()
            .filter(|i| i.card_id == card.id)
            .cloned()
            .collect();
    }

    Ok(result)
}

#[tauri::command]
pub fn create_card(db: tauri::State<'_, Database>) -> Result<Card, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM cards", [], |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO cards (id, title, collapsed, sort_order) VALUES (?1, '', 0, ?2)",
        params![id, max_order + 1],
    ).map_err(|e| e.to_string())?;

    let item_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO items (id, card_id, text, start_time, end_time, done, sort_order) VALUES (?1, ?2, '', '', '', 0, 0)",
        params![item_id, id],
    ).map_err(|e| e.to_string())?;

    Ok(Card {
        id: id.clone(),
        title: String::new(),
        collapsed: false,
        date: None,
        items: vec![Item {
            id: item_id,
            card_id: id,
            text: String::new(),
            start: String::new(),
            end: String::new(),
            done: false,
        }],
    })
}

#[tauri::command]
pub fn update_card(db: tauri::State<'_, Database>, id: String, title: Option<String>, collapsed: Option<bool>, date: Option<Option<String>>) -> Result<(), String> {
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
pub fn create_item(db: tauri::State<'_, Database>, card_id: String) -> Result<Item, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM items WHERE card_id = ?1",
        params![card_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO items (id, card_id, text, start_time, end_time, done, sort_order) VALUES (?1, ?2, '', '', '', 0, ?3)",
        params![id, card_id, max_order + 1],
    ).map_err(|e| e.to_string())?;

    Ok(Item {
        id,
        card_id,
        text: String::new(),
        start: String::new(),
        end: String::new(),
        done: false,
    })
}

#[tauri::command]
pub fn update_item(db: tauri::State<'_, Database>, id: String, text: Option<String>, start: Option<String>, end: Option<String>, done: Option<bool>) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    if let Some(ref t) = text {
        conn.execute("UPDATE items SET text = ?1 WHERE id = ?2", params![t, id])
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

    Ok(())
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
