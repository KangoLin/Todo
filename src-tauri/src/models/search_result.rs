use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub card_id: String,
    pub title: String,
    pub snippet: String,
    pub column_id: String,
    pub board_id: String,
    pub project_id: String,
}
