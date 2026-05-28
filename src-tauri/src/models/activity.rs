use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Activity {
    pub id: String,
    pub card_id: Option<String>,
    pub board_id: String,
    pub action: String,
    pub description: String,
    pub created_at: String,
}
