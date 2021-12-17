#![allow(non_snake_case)]
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::str::FromStr;

use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};
use tauri_plugin_log::{LogTarget, LoggerBuilder};
use tauri_plugin_store::StorePlugin;

mod daemon;
mod menu;

#[tokio::main]
async fn main() {
  let log_plugin = {
    let targets = [
      LogTarget::LogDir,
      #[cfg(debug_assertions)]
      LogTarget::Stdout,
      #[cfg(debug_assertions)]
      LogTarget::Webview,
    ];

    let filter = std::env::var("RUST_LOG")
      .map(|str| log::LevelFilter::from_str(&str).expect("failed to construct level filter"))
      .unwrap_or(log::LevelFilter::Debug);

    LoggerBuilder::new(targets).level(filter).build()
  };

  tauri::Builder::default()
    .plugin(log_plugin)
    .plugin(daemon::DaemonPlugin::new())
    .plugin(StorePlugin::default())
    .menu(menu::get_menu())
    .setup(|app| {
      daemon::start_daemon(
        app.state::<daemon::Connection>(),
        app.state::<daemon::Flags>(),
      );

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
    .on_system_tray_event(|app, event| {
      if let SystemTrayEvent::MenuItemClick { id, .. } = event {
        match id.as_str() {
          "exit_app" => {
            // exit the app
            app.exit(0);
          }
          "start" => {
            daemon::start_daemon(
              app.state::<daemon::Connection>(),
              app.state::<daemon::Flags>(),
            );

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
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
