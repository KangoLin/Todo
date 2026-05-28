mod db;
mod models;
mod commands;

use db::Database;
use tauri::Manager;

fn get_db_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_dir = app.path().app_local_data_dir().map_err(|e| format!("Failed to get app dir: {}", e))?;
    std::fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create app dir: {}", e))?;
    Ok(app_dir.join("todo-potato.db"))
}

#[tauri::command]
fn get_db_stats_cmd(db: tauri::State<Database>) -> Result<commands::settings_cmds::DbStats, String> {
    commands::settings_cmds::get_db_stats(db)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let db_path = get_db_path(app.handle())
                .map_err(|e| format!("Failed to get db path: {}", e))?;
            let database = Database::new(db_path.to_str().unwrap())
                .map_err(|e| format!("Failed to initialize database: {}", e))?;
            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Projects
            commands::project_cmds::create_project,
            commands::project_cmds::get_all_projects,
            commands::project_cmds::get_project,
            commands::project_cmds::update_project,
            commands::project_cmds::delete_project,
            // Boards
            commands::board_cmds::create_board,
            commands::board_cmds::get_board,
            commands::board_cmds::get_boards_by_project,
            commands::board_cmds::update_board,
            commands::board_cmds::delete_board,
            commands::board_cmds::reorder_boards,
            // Columns
            commands::column_cmds::create_column,
            commands::column_cmds::get_columns_by_board,
            commands::column_cmds::update_column,
            commands::column_cmds::delete_column,
            commands::column_cmds::reorder_columns,
            // Cards
            commands::card_cmds::create_card,
            commands::card_cmds::get_cards_by_column,
            commands::card_cmds::get_card,
            commands::card_cmds::update_card,
            commands::card_cmds::move_card,
            commands::card_cmds::move_card_within_column,
            commands::card_cmds::archive_card,
            commands::card_cmds::restore_card,
            commands::card_cmds::get_archived_cards_by_board,
            commands::card_cmds::delete_card,
            // Subtasks
            commands::subtask_cmds::create_subtask,
            commands::subtask_cmds::toggle_subtask,
            commands::subtask_cmds::delete_subtask,
            // Tags
            commands::tag_cmds::create_tag,
            commands::tag_cmds::get_tags_by_board,
            commands::tag_cmds::delete_tag,
            commands::tag_cmds::add_tag_to_card,
            commands::tag_cmds::remove_tag_from_card,
            commands::tag_cmds::get_tags_by_card,
            // Search
            commands::search_cmds::search_cards,
            // Settings
            commands::settings_cmds::get_setting,
            commands::settings_cmds::set_setting,
            // Stats
            get_db_stats_cmd,
            // Data import/export
            commands::data_cmds::export_data,
            commands::data_cmds::import_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
