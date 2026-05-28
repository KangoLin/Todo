pub mod migrations;
pub mod projects;
pub mod boards;
pub mod columns;
pub mod cards;
pub mod subtasks;
pub mod tags;
pub mod search;
pub mod comments;
pub mod activities;

use rusqlite::Connection;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: &str) -> Result<Self, String> {
        let conn = Connection::open(db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA encoding = 'UTF-8';")
            .map_err(|e| format!("Failed to set pragmas: {}", e))?;

        let db = Database {
            conn: Mutex::new(conn),
        };

        db.run_migrations()?;
        Ok(db)
    }

    fn run_migrations(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        migrations::run_migrations(&conn)
    }
}
