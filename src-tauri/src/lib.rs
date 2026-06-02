mod db;

use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
            let db_path = app_dir.join("todo.db");
            let database = Database::new(db_path.to_str().unwrap())
                .expect("failed to initialize database");
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db::get_cards,
            db::create_card,
            db::update_card,
            db::delete_card,
            db::reorder_cards,
            db::create_item,
            db::update_item,
            db::delete_item,
            db::reorder_items,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
