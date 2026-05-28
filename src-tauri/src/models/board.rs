use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Board {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub description: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
    pub background: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBoardRequest {
    pub project_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateBoardRequest {
    pub id: String,
    pub name: Option<String>,
    pub background: Option<String>,
}
