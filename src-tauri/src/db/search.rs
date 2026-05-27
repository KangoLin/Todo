use rusqlite::{Connection, params};
use crate::models::SearchResult;

fn map_row(row: &rusqlite::Row) -> rusqlite::Result<SearchResult> {
    Ok(SearchResult {
        card_id: row.get(0)?,
        title: row.get(1)?,
        snippet: row.get(2)?,
        column_id: row.get(3)?,
        board_id: row.get(4)?,
        project_id: row.get(5)?,
    })
}

pub fn search(conn: &Connection, query: &str, project_id: Option<&str>) -> Result<Vec<SearchResult>, String> {
    let sql = match project_id {
        Some(_) => {
            "SELECT c.id, c.title, snippet(cards_fts, 1, '<b>', '</b>', '...', 32) as snippet, \
             c.column_id, b.id, b.project_id \
             FROM cards_fts fts \
             JOIN cards c ON c.id = fts.card_id \
             JOIN columns col ON col.id = c.column_id \
             JOIN boards b ON b.id = col.board_id \
             WHERE cards_fts MATCH ?1 AND b.project_id = ?2 \
             AND c.is_archived = 0 \
             LIMIT 50"
        },
        None => {
            "SELECT c.id, c.title, snippet(cards_fts, 1, '<b>', '</b>', '...', 32) as snippet, \
             c.column_id, b.id, b.project_id \
             FROM cards_fts fts \
             JOIN cards c ON c.id = fts.card_id \
             JOIN columns col ON col.id = c.column_id \
             JOIN boards b ON b.id = col.board_id \
             WHERE cards_fts MATCH ?1 AND c.is_archived = 0 \
             LIMIT 50"
        }
    };

    let mut stmt = conn.prepare(sql)
        .map_err(|e| format!("Failed to prepare search: {}", e))?;

    let search_query = format!("{}*", query);
    let results: Vec<SearchResult> = match project_id {
        Some(pid) => {
            stmt.query_map(params![search_query, pid], map_row)
        },
        None => {
            stmt.query_map(params![search_query], map_row)
        }
    }.map_err(|e| format!("Search query failed: {}", e))?
    .filter_map(|r| r.ok())
    .collect();

    Ok(results)
}
