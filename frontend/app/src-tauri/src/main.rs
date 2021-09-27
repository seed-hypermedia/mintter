#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};

mod daemon;
mod menu;

#[tokio::main]
async fn main() {
  tauri::Builder::default()
    .plugin(daemon::DaemonPlugin::new())
    .menu(menu::get_menu())
    .setup(|app| {
      daemon::start_daemon(app.state::<daemon::Connection>()).unwrap();
      Ok(())
    })
    .system_tray(
      SystemTray::new().with_menu(
        SystemTrayMenu::new()
          .add_item(CustomMenuItem::new("start", "Start Daemon"))
          .add_item(CustomMenuItem::new("stop", "Stop Daemon"))
          .add_item(CustomMenuItem::new("exit_app", "Quit")),
      ),
    )
    .on_system_tray_event(|app, event| match event {
      SystemTrayEvent::MenuItemClick { id, .. } => {
        match id.as_str() {
          "exit_app" => {
            // exit the app
            app.exit(0);
          }
          "start" => {
            daemon::start_daemon(app.state::<daemon::Connection>()).unwrap();
          }
          "stop" => {
            daemon::stop_daemon(app.state::<daemon::Connection>()).unwrap();
          }
          _ => {}
        }
      }
      _ => {}
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
