use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    path::BaseDirectory,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

static QUICK_ADD_ACTIVE: AtomicBool = AtomicBool::new(false);
static MAIN_WAS_VISIBLE: AtomicBool = AtomicBool::new(false);

/// Get the path to the localStorage backup file
fn storage_path(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().resolve("localStorage.json", BaseDirectory::AppData).ok()
}

/// Save localStorage from the main window to a file
fn save_local_storage(app: &AppHandle) {
    let _path = match storage_path(app) {
        Some(p) => p,
        None => return,
    };
    let main_win = match app.get_webview_window("main") {
        Some(w) => w,
        None => return,
    };
    let _ = main_win.eval(&format!(
        r#"(function() {{
            try {{
                var data = {{}};
                for (var i = 0; i < localStorage.length; i++) {{
                    var key = localStorage.key(i);
                    data[key] = localStorage.getItem(key);
                }}
                window.__TAURI__.core.invoke('save_storage_file', {{ data: JSON.stringify(data) }});
            }} catch(e) {{}}
        }})();"#
    ));
}

#[tauri::command]
fn save_storage_file(app: AppHandle, data: String) {
    if let Some(path) = storage_path(&app) {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(&path, &data);
    }
}

/// Restore localStorage from the backup file (returns JS to inject)
fn restore_local_storage_js(app: &AppHandle) -> String {
    let path = match storage_path(app) {
        Some(p) => p,
        None => return String::new(),
    };
    let data = match std::fs::read_to_string(&path) {
        Ok(d) => d,
        Err(_) => return String::new(),
    };
    let escaped = serde_json::to_string(&data).unwrap_or_default();
    format!(
        r#"(function() {{
            try {{
                var data = JSON.parse({escaped});
                for (var key in data) {{
                    if (localStorage.getItem(key) === null) {{
                        localStorage.setItem(key, data[key]);
                    }}
                }}
            }} catch(e) {{}}
        }})();"#,
        escaped = escaped,
    )
}

#[tauri::command]
fn quick_add_task(app: AppHandle, text: String, to_today: bool) {
    if let Some(main_win) = app.get_webview_window("main") {
        let day_key_expr = if to_today {
            "new Date().toISOString().slice(0,10)"
        } else {
            "null"
        };
        let escaped = serde_json::to_string(&text).unwrap_or_default();
        let js = format!(
            r#"(function() {{
                var store = window.__ZUSTAND_STORE__;
                if (store && store.getState) {{
                    store.getState().addItem({{ type: 'task', text: {escaped}, dayKey: {day_key} }});
                }}
            }})();"#,
            escaped = escaped,
            day_key = day_key_expr,
        );
        let _ = main_win.eval(&js);
    }
}

#[tauri::command]
fn close_quick_add(app: AppHandle) {
    QUICK_ADD_ACTIVE.store(false, Ordering::SeqCst);
    if let Some(win) = app.get_webview_window("quick-add") {
        let _ = win.hide();
    }
    if MAIN_WAS_VISIBLE.load(Ordering::SeqCst) {
        if let Some(mw) = app.get_webview_window("main") {
            let _ = mw.show();
        }
    }
}

fn show_quick_add(app: &AppHandle) {
    QUICK_ADD_ACTIVE.store(true, Ordering::SeqCst);

    let was_visible = app
        .get_webview_window("main")
        .map(|w| w.is_visible().unwrap_or(false))
        .unwrap_or(false);
    MAIN_WAS_VISIBLE.store(was_visible, Ordering::SeqCst);
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.hide();
    }

    if let Some(win) = app.get_webview_window("quick-add") {
        let _ = win.center();
        let _ = win.show();
        let _ = win.set_focus();
    } else {
        let builder = WebviewWindowBuilder::new(
            app,
            "quick-add",
            WebviewUrl::App("quick-add.html".into()),
        )
            .title("")
            .inner_size(510.0, 104.0)
            .resizable(false)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .shadow(false)
            .center();

        if let Ok(w) = builder.build() {
            let app_handle = app.clone();
            let w_clone: tauri::WebviewWindow = w;
            w_clone.on_window_event(move |event: &tauri::WindowEvent| {
                if let tauri::WindowEvent::Focused(false) = event {
                    QUICK_ADD_ACTIVE.store(false, Ordering::SeqCst);
                    if let Some(qw) = app_handle.get_webview_window("quick-add") {
                        let _ = qw.hide();
                    }
                    if MAIN_WAS_VISIBLE.load(Ordering::SeqCst) {
                        if let Some(mw) = app_handle.get_webview_window("main") {
                            let _ = mw.show();
                        }
                    }
                }
            });
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![quick_add_task, close_quick_add, save_storage_file])
        .setup(|app| {
            // Restore localStorage before the page loads
            let restore_js = restore_local_storage_js(app.handle());

            if let Some(main_win) = app.get_webview_window("main") {
                // Inject localStorage restore after page has loaded
                let js = restore_js.clone();
                let win_clone = main_win.clone();
                std::thread::spawn(move || {
                    // Wait for the page to load
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    let _ = win_clone.eval(&js);
                    // Trigger Supabase to re-read the restored session
                    std::thread::sleep(std::time::Duration::from_millis(200));
                    let _ = win_clone.eval(
                        r#"(function() {
                            if (window.__SUPABASE_CLIENT__) {
                                window.__SUPABASE_CLIENT__.auth.getSession();
                            } else {
                                // Retry after app fully initializes
                                setTimeout(function() {
                                    if (window.__SUPABASE_CLIENT__) {
                                        window.__SUPABASE_CLIENT__.auth.getSession();
                                    }
                                }, 1000);
                            }
                        })();"#
                    );
                });

                let _ = main_win.show();
                let _ = main_win.set_focus();
            }

            // --- System tray ---
            let show_item = MenuItem::with_id(app, "show", "Show Zenmode", true, None::<&str>)?;
            let quick_add_item = MenuItem::with_id(app, "quick_add", "Quick Add (Cmd+Shift+N)", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_item, &quick_add_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("zenmode")
                .icon_as_template(true)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.set_focus();
                            }
                        }
                        "quick_add" => {
                            show_quick_add(app);
                        }
                        "quit" => {
                            // Save localStorage before quitting
                            save_local_storage(app);
                            // Small delay to let the save complete
                            std::thread::sleep(std::time::Duration::from_millis(200));
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // --- Global shortcut: Cmd+Shift+N ---
            let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyN);
            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, _event| {
                show_quick_add(&app_handle);
            })?;

            // --- Hide main window on close (keep in tray) ---
            if let Some(main_win) = app.get_webview_window("main") {
                let handle = app.handle().clone();
                main_win.on_window_event(move |event: &tauri::WindowEvent| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        // Save localStorage when hiding
                        save_local_storage(&handle);
                        if let Some(w) = handle.get_webview_window("main") {
                            let _ = w.hide();
                        }
                    }
                });
            }

            // --- Periodic localStorage save (every 30 seconds) ---
            let save_handle = app.handle().clone();
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(30));
                    save_local_storage(&save_handle);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
