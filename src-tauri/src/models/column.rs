use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Column {
    pub id: String,
    pub board_id: String,
    pub name: String,
    pub sort_order: i32,
    pub wip_limit: Option<i32>,
    pub color: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateColumnRequest {
    pub board_id: String,
    pub name: String,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateColumnRequest {
    pub id: String,
    pub name: Option<String>,
    pub wip_limit: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReorderRequest {
    pub ids: Vec<String>,
}
