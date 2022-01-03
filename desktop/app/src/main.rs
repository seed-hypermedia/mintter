#![allow(non_snake_case)]
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::str::FromStr;
use tauri::Manager;
use tauri_plugin_log::{LogTarget, LoggerBuilder};
use tauri_plugin_store::PluginBuilder as StorePluginBuilder;

mod daemon;
mod extensions;
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
      .unwrap_or(log::LevelFilter::Info);

    LoggerBuilder::new(targets).level(filter).build()
  };

  let app = tauri::Builder::default()
    .plugin(log_plugin)
    .plugin(daemon::Plugin::default())
    .plugin(StorePluginBuilder::default().build())
    .plugin(extensions::Plugin::default())
    .menu(menu::get_menu())
    .setup(|app| {
      daemon::start_daemon(
        app.state::<daemon::Connection>(),
        app.state::<daemon::Flags>(),
      );

      Ok(())
    })
    .system_tray(system_tray::get_tray())
    .on_system_tray_event(system_tray::event_handler);

  // During testing the frontend isn't build, so `tauri::generate_context!()` would fail.
  if !cfg!(test) {
    app
      .run(tauri::generate_context!())
      .expect("error while running tauri application");
  }
}
