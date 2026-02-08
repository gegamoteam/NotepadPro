use serde::{Deserialize, Serialize};
use std::fs;
use std::time::SystemTime;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

struct WatcherState(Mutex<Option<RecommendedWatcher>>);

#[derive(Serialize, Deserialize, Clone)]
struct WatchEvent {
    kind: String,
    paths: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    last_modified: u64,
}

#[tauri::command]
fn watch_dir(app: AppHandle, state: State<'_, WatcherState>, path: String) -> Result<(), String> {
    let mut watcher_guard = state.0.lock().map_err(|e| e.to_string())?;
    
    // Stop previous watcher if any (by dropping it)
    *watcher_guard = None;

    let app_handle = app.clone();
    let mut watcher = notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
        match res {
            Ok(event) => {
                let payload = WatchEvent {
                    kind: format!("{:?}", event.kind),
                    paths: event
                        .paths
                        .iter()
                        .map(|p| p.to_string_lossy().into_owned())
                        .collect(),
                };
                let _ = app_handle.emit("file-changed", payload);
            }
            Err(e) => println!("watch error: {:?}", e),
        }
    }).map_err(|e| e.to_string())?;

    watcher.watch(std::path::Path::new(&path), RecursiveMode::Recursive).map_err(|e| e.to_string())?;

    *watcher_guard = Some(watcher);
    Ok(())
}

#[tauri::command]
fn read_note(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_note(path: String, content: String) -> Result<bool, String> {
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn write_binary(path: String, data: Vec<u8>) -> Result<bool, String> {
    fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn list_notes(dir: String) -> Result<Vec<FileEntry>, String> {
    let paths = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut entries = Vec::new();

    for path in paths {
        let path = path.map_err(|e| e.to_string())?;
        let metadata = path.metadata().map_err(|e| e.to_string())?;
        
        let last_modified = metadata
            .modified()
            .unwrap_or(SystemTime::UNIX_EPOCH)
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        entries.push(FileEntry {
            name: path.file_name().to_string_lossy().into_owned(),
            path: path.path().to_string_lossy().into_owned(),
            is_dir: metadata.is_dir(),
            last_modified,
        });
    }

    Ok(entries)
}

#[tauri::command]
fn create_folder(path: String) -> Result<bool, String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn rename_item(old_path: String, new_path: String) -> Result<bool, String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn delete_item(path: String) -> Result<bool, String> {
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    if metadata.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
    } else {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(true)
}

#[derive(Serialize, Deserialize)]
struct SearchResult {
    file: FileEntry,
    snippet: String,
    match_type: String, // "content" or "name"
    score: u32,
}

#[tauri::command]
fn search_notes(dir: String, query: String) -> Result<Vec<SearchResult>, String> {
    let mut results = Vec::new();
    let paths = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let query_lower = query.to_lowercase();

    for path in paths {
        let path = path.map_err(|e| e.to_string())?;
        let metadata = path.metadata().map_err(|e| e.to_string())?;
        let file_path = path.path();
        let name = path.file_name().to_string_lossy().into_owned();
        let name_lower = name.to_lowercase();
        
        // Skip hidden files or system files if needed
        if name.starts_with('.') { continue; }

        let mut matched = false;
        let mut match_type = String::new();
        let mut snippet = String::new();
        let mut score = 0;

        // Check name match
        if name_lower.contains(&query_lower) {
            matched = true;
            match_type = "name".to_string();
            score = 10;
        }

        // Check content match (only for text files and if not a folder)
        if !metadata.is_dir() {
             if let Ok(content) = fs::read_to_string(&file_path) {
                let content_lower = content.to_lowercase();
                if let Some(idx) = content_lower.find(&query_lower) {
                    if !matched { // If name matched, we prioritize that, but maybe we want both? For now keep name priority or distinct?
                        // Actually let's upgrade score if both
                        if matched {
                             score += 5;
                        } else {
                            matched = true;
                            match_type = "content".to_string();
                            score = 5;
                        }
                    }
                    
                    // Extract snippet
                    let start = if idx > 20 { idx - 20 } else { 0 };
                    let end = std::cmp::min(content.len(), idx + query.len() + 40);
                    snippet = content[start..end].replace("\n", " ").to_string();
                    if start > 0 { snippet.insert_str(0, "..."); }
                    if end < content.len() { snippet.push_str("..."); }
                }
             }
        }

        if matched {
             let last_modified = metadata
                .modified()
                .unwrap_or(SystemTime::UNIX_EPOCH)
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            results.push(SearchResult {
                file: FileEntry {
                    name,
                    path: file_path.to_string_lossy().into_owned(),
                    is_dir: metadata.is_dir(),
                    last_modified,
                },
                snippet,
                match_type,
                score,
            });
        }
    }
    
    // Sort results by score desc
    results.sort_by(|a, b| b.score.cmp(&a.score));
    Ok(results)
}

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WatcherState(Mutex::new(None)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main").expect("no main window").show();
            let _ = app.get_webview_window("main").expect("no main window").set_focus();
        }))
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show NoteX", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id("tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } => {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            read_note,
            write_note,
            write_binary,
            list_notes,
            create_folder,
            rename_item,
            delete_item,
            search_notes,
            watch_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
