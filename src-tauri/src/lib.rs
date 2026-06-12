use serde::{Deserialize, Serialize};
use std::fs;
use std::time::SystemTime;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    WindowEvent,
};
use tauri_plugin_deep_link::DeepLinkExt;

struct WatcherState(Mutex<Option<RecommendedWatcher>>);

// Global shortcut state: stores the currently registered shortcut string
struct ShortcutStore(Mutex<Option<String>>);

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

// --- Global Shortcut Commands ---

#[tauri::command]
fn register_shortcut(app: AppHandle, state: State<'_, ShortcutStore>, shortcut: String) -> Result<bool, String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    // Unregister any existing shortcut first
    let mut store = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(ref old) = *store {
        let _ = app.global_shortcut().unregister(old.as_str());
    }

    // Register the new shortcut
    app.global_shortcut()
        .on_shortcut(shortcut.as_str(), move |app_handle, _shortcut, event| {
            if matches!(event.state(), tauri_plugin_global_shortcut::ShortcutState::Pressed) {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                    // Tell the frontend to create a new note
                    let _ = app_handle.emit("shortcut-new-note", ());
                }
            }
        })
        .map_err(|e| e.to_string())?;

    *store = Some(shortcut);
    Ok(true)
}

#[tauri::command]
fn unregister_shortcut(app: AppHandle, state: State<'_, ShortcutStore>) -> Result<bool, String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    let mut store = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(ref old) = *store {
        app.global_shortcut().unregister(old.as_str()).map_err(|e| e.to_string())?;
    }
    *store = None;
    Ok(true)
}

#[tauri::command]
fn get_current_shortcut(state: State<'_, ShortcutStore>) -> Result<Option<String>, String> {
    let store = state.0.lock().map_err(|e| e.to_string())?;
    Ok(store.clone())
}

// Managed state for file path passed via command line on startup
struct StartupFile(Mutex<Option<String>>);

#[tauri::command]
fn open_file_dialog() -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Text & Markdown", &["txt", "md", "markdown", "json", "html", "css", "js", "ts"])
        .pick_file();
    Ok(file.map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
fn save_file_dialog(default_name: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new();
    if let Some(name) = default_name {
        dialog = dialog.set_file_name(name);
    }
    let file = dialog
        .add_filter("Text & Markdown", &["txt", "md", "markdown", "json", "html", "css", "js", "ts"])
        .save_file();
    Ok(file.map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
fn get_startup_file(state: State<'_, StartupFile>) -> Result<Option<String>, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    Ok(guard.take())
}

struct StartupDeepLink(Mutex<Option<String>>);

#[tauri::command]
fn get_startup_deep_link(state: State<'_, StartupDeepLink>) -> Result<Option<String>, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    Ok(guard.take())
}

#[derive(Serialize)]
struct OsInfo {
    os: &'static str,
    arch: &'static str,
}

#[tauri::command]
fn get_os_info() -> OsInfo {
    OsInfo {
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
    }
}

fn download_file_native(app: AppHandle, url: &str, dest_path: &str) -> Result<(), String> {
    use std::io::{Read, Write};

    let response = ureq::get(url)
        .call()
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let total_size = response
        .header("Content-Length")
        .and_then(|val| val.parse::<u64>().ok())
        .unwrap_or(0);

    let mut reader = response.into_reader();
    let mut file = std::fs::File::create(dest_path)
        .map_err(|e| format!("Failed to create destination file: {}", e))?;

    let mut buffer = [0; 8192];
    let mut downloaded: u64 = 0;
    let mut last_emit = std::time::Instant::now();

    loop {
        let bytes_read = reader.read(&mut buffer)
            .map_err(|e| format!("Failed to read stream: {}", e))?;

        if bytes_read == 0 {
            break;
        }

        file.write_all(&buffer[..bytes_read])
            .map_err(|e| format!("Failed to write to file: {}", e))?;

        downloaded += bytes_read as u64;

        if last_emit.elapsed().as_millis() > 100 {
            let pct = if total_size > 0 {
                (downloaded as f64 / total_size as f64 * 100.0) as u32
            } else {
                0
            };
            let _ = app.emit("download-progress", pct);
            last_emit = std::time::Instant::now();
        }
    }

    file.flush().map_err(|e| e.to_string())?;
    let _ = app.emit("download-progress", 100);

    Ok(())
}

#[tauri::command]
fn start_download(app: AppHandle, url: String, dest_path: String, _total_size: u64) -> Result<(), String> {
    std::thread::spawn(move || {
        let app_clone = app.clone();
        let dest_clone = dest_path.clone();

        match download_file_native(app.clone(), &url, &dest_clone) {
            Ok(_) => {
                let _ = app_clone.emit("download-complete", ());
            }
            Err(e) => {
                let _ = std::fs::remove_file(&dest_clone);
                let _ = app_clone.emit("download-error", e);
            }
        }
    });
    Ok(())
}

#[tauri::command]
fn install_update(app: AppHandle, path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x00000008;

        if path.ends_with(".msi") {
            std::process::Command::new("msiexec")
                .args(&["/i", &path])
                .creation_flags(DETACHED_PROCESS)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            std::process::Command::new(&path)
                .creation_flags(DETACHED_PROCESS)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        if path.ends_with(".AppImage") || path.ends_with(".appimage") {
            let _ = std::process::Command::new("chmod")
                .args(&["+x", &path])
                .status();

            if let Ok(current_exe) = std::env::current_exe() {
                let backup_path = current_exe.with_extension("old");
                // Rename current exe to backup to release the file handle
                let _ = std::fs::rename(&current_exe, &backup_path);
                // Copy new AppImage over the current exe path
                if std::fs::copy(&path, &current_exe).is_ok() {
                    // Make sure the replaced file is executable
                    let _ = std::process::Command::new("chmod")
                        .args(&["+x", &current_exe.to_string_lossy()])
                        .status();
                    // Spawn the updated app from its original location
                    let current_exe_str = current_exe.to_string_lossy();
                    let _ = std::process::Command::new("sh")
                        .args(&["-c", &format!("nohup \"{}\" >/dev/null 2>&1 &", current_exe_str)])
                        .spawn();
                    // Clean up
                    let _ = std::fs::remove_file(&path);
                    let _ = std::fs::remove_file(&backup_path);
                } else {
                    // Fallback to spawning the downloaded one directly if copy failed
                    let _ = std::process::Command::new("sh")
                        .args(&["-c", &format!("nohup \"{}\" >/dev/null 2>&1 &", path)])
                        .spawn();
                }
            } else {
                // Fallback if current_exe cannot be determined
                std::process::Command::new("sh")
                    .args(&["-c", &format!("nohup \"{}\" >/dev/null 2>&1 &", path)])
                    .spawn()
                    .map_err(|e| e.to_string())?;
            }
        } else {
            std::process::Command::new("xdg-open")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }

    app.exit(0);
    Ok(())
}


// ─── Secure Value Storage ────────────────────────────────────────────────────
// Stores small values (like JWTs) in a JSON file inside the app's dedicated
// data directory. On all OSes this directory is only accessible to the current
// user (Windows: %APPDATA%\com.theo.notex, Linux: ~/.local/share/com.theo.notex).

/// Store a value keyed by `key` in the app's secure data directory.
/// Passing `null` / None deletes the key.
#[tauri::command]
fn store_secure_value(
    app: AppHandle,
    key: String,
    value: Option<String>,
) -> Result<(), String> {
    let path = secure_store_path(&app)?;
    let mut map = load_secure_store(&path);

    match value {
        Some(v) => { map.insert(key, v); }
        None    => { map.remove(&key); }
    }

    let serialized = serde_json::to_string(&map).map_err(|e| e.to_string())?;
    // Write atomically via a temp file then rename
    let tmp_path = path.with_extension("tmp");
    fs::write(&tmp_path, serialized).map_err(|e| e.to_string())?;
    fs::rename(&tmp_path, &path).map_err(|e| e.to_string())?;
    Ok(())
}

/// Load a value by `key` from the secure store. Returns None if not found.
#[tauri::command]
fn load_secure_value(
    app: AppHandle,
    key: String,
) -> Result<Option<String>, String> {
    let path = secure_store_path(&app)?;
    let map = load_secure_store(&path);
    Ok(map.get(&key).cloned())
}

fn secure_store_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    Ok(data_dir.join("secure_store.json"))
}

fn load_secure_store(
    path: &std::path::PathBuf,
) -> std::collections::HashMap<String, String> {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

// ─────────────────────────────────────────────────────────────────────────────



fn get_file_from_args(args: &[String]) -> Option<String> {
    for arg in args.iter().skip(1) {
        if arg.starts_with('-') {
            continue;
        }
        let mut decoded_path = arg.clone();
        if arg.starts_with("file://") {
            if let Ok(url) = url::Url::parse(arg) {
                if let Ok(path) = url.to_file_path() {
                    decoded_path = path.to_string_lossy().into_owned();
                }
            }
        }
        if std::path::Path::new(&decoded_path).is_file() {
            return Some(decoded_path);
        }
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    let startup_file = get_file_from_args(&args);
    let startup_deep_link = args.iter().find(|arg| arg.starts_with("notex://")).cloned();

    tauri::Builder::default()
        .manage(WatcherState(Mutex::new(None)))
        .manage(ShortcutStore(Mutex::new(None)))
        .manage(StartupFile(Mutex::new(startup_file)))
        .manage(StartupDeepLink(Mutex::new(startup_deep_link)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            for arg in &args {
                if arg.starts_with("notex://") {
                    let _ = app.emit("deep-link", arg.clone());
                }
            }
            if let Some(file_path) = get_file_from_args(&args) {
                let _ = app.emit("open-external-file", file_path);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
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

            // Register default global shortcut (Ctrl+Shift+N)
            {
                use tauri_plugin_global_shortcut::GlobalShortcutExt;
                let app_handle = app.handle().clone();
                let _ = app.global_shortcut().on_shortcut("Ctrl+Shift+N", move |_app, _shortcut, event| {
                    if matches!(event.state(), tauri_plugin_global_shortcut::ShortcutState::Pressed) {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            // Tell the frontend to create a new note
                            let _ = app_handle.emit("shortcut-new-note", ());
                        }
                    }
                });
                // Store the default in managed state
                let store = app.state::<ShortcutStore>();
                let mut guard = store.0.lock().unwrap();
                *guard = Some("Ctrl+Shift+N".to_string());
            }

            #[cfg(desktop)]
            let _ = app.deep_link().register("notex");

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
            watch_dir,
            register_shortcut,
            unregister_shortcut,
            get_current_shortcut,
            open_file_dialog,
            save_file_dialog,
            get_startup_file,
            get_startup_deep_link,
            get_os_info,
            start_download,
            install_update,
            store_secure_value,
            load_secure_value
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
