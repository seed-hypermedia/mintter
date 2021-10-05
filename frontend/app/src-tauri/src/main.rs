#![allow(non_snake_case)]
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};
use tauri_plugin_log::{LogTarget, LoggerBuilder};

mod daemon;
mod menu;

#[tokio::main]
async fn main() {
  tauri::Builder::default()
    .plugin(LoggerBuilder::new([LogTarget::AppDir, LogTarget::Stdout, LogTarget::Webview]).build())
    .plugin(daemon::DaemonPlugin::new())
    .menu(menu::get_menu())
    .setup(|app| {
      daemon::start_daemon(app.state::<daemon::Connection>());
      Ok(())
    })
    .system_tray(
      SystemTray::new().with_menu(
        SystemTrayMenu::new()
          .add_item(
            CustomMenuItem::new("status", "Online")
              .native_image(tauri::NativeImage::StatusAvailable),
          )
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
            daemon::start_daemon(app.state::<daemon::Connection>());

            let status_handle = app.tray_handle().get_item("status");

            status_handle.set_title("Online").unwrap();
            status_handle
              .set_native_image(tauri::NativeImage::StatusAvailable)
              .unwrap();
          }
          "stop" => {
            daemon::stop_daemon(app.state::<daemon::Connection>());
            let item_handle = app.tray_handle().get_item("status");

            item_handle.set_title("Offline").unwrap();
            item_handle
              .set_native_image(tauri::NativeImage::StatusNone)
              .unwrap();
          }
          _ => {}
        }
      }
      _ => {}
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
