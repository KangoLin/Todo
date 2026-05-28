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

    if version < 2 {
        let sql = include_str!("../../migrations/002_background.sql");
        conn.execute_batch(sql)
            .map_err(|e| format!("Migration 002 failed: {}", e))?;
        conn.execute_batch("PRAGMA user_version = 2")
            .map_err(|e| format!("Failed to update schema version: {}", e))?;
    }

    if version < 3 {
        let sql = include_str!("../../migrations/003_comments.sql");
        conn.execute_batch(sql)
            .map_err(|e| format!("Migration 003 failed: {}", e))?;
        conn.execute_batch("PRAGMA user_version = 3")
            .map_err(|e| format!("Failed to update schema version: {}", e))?;
    }

    if version < 4 {
        let sql = include_str!("../../migrations/004_activities.sql");
        conn.execute_batch(sql)
            .map_err(|e| format!("Migration 004 failed: {}", e))?;
        conn.execute_batch("PRAGMA user_version = 4")
            .map_err(|e| format!("Failed to update schema version: {}", e))?;
    }

    Ok(())
}
