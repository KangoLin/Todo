use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    let version: i32 = conn
        .pragma_query_value(None, "user_version", |row| row.get::<_, i32>(0))
        .map_err(|e| format!("Failed to read schema version: {}", e))?;

    if version < 1 {
        let sql = include_str!("../../migrations/001_initial.sql");
        conn.execute_batch(sql)
            .map_err(|e| format!("Migration 001 failed: {}", e))?;
        conn.execute_batch("PRAGMA user_version = 1")
            .map_err(|e| format!("Failed to update schema version: {}", e))?;
    }

    Ok(())
}
