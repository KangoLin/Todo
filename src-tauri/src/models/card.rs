use serde::{Deserialize, Serialize};
use super::subtask::Subtask;
use super::tag::Tag;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub column_id: String,
    pub title: String,
    pub description: String,
    pub sort_order: i32,
    pub priority: i32,
    pub due_date: Option<String>,
    pub cover_color: Option<String>,
    pub is_archived: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardDetail {
    pub card: Card,
    pub subtasks: Vec<Subtask>,
    pub tags: Vec<Tag>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCardRequest {
    pub column_id: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCardRequest {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<i32>,
    pub due_date: Option<String>,
    pub cover_color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveCardRequest {
    pub card_id: String,
    pub target_column_id: String,
    pub target_sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveCardWithinColumnRequest {
    pub card_id: String,
    pub target_sort_order: i32,
}
