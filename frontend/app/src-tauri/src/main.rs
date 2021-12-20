#![allow(non_snake_case)]
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::str::FromStr;
use tauri::Manager;
use tauri_plugin_log::{LogTarget, LoggerBuilder};
use tauri_plugin_store::StorePlugin;

mod daemon;
mod menu;
mod system_tray;

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
    .system_tray(system_tray::get_tray())
    .on_system_tray_event(system_tray::event_handler)
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
