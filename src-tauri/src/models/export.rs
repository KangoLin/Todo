use serde::{Deserialize, Serialize};
use super::project::Project;
use super::board::Board;
use super::column::Column;
use super::card::Card;
use super::subtask::Subtask;
use super::tag::Tag;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportData {
    pub version: i32,
    pub projects: Vec<Project>,
    pub boards: Vec<Board>,
    pub columns: Vec<Column>,
    pub cards: Vec<Card>,
    pub subtasks: Vec<Subtask>,
    pub tags: Vec<Tag>,
    pub card_tags: Vec<CardTagLink>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardTagLink {
    pub card_id: String,
    pub tag_id: String,
}
