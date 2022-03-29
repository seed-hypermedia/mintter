#![allow(non_snake_case)]
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use env_logger::filter::Builder as FilterBuilder;
use log::LevelFilter;
use tauri::Manager;
use tauri_plugin_log::{fern::colors::ColoredLevelConfig, LogTarget, LoggerBuilder};
use tauri_plugin_store::Builder as StorePluginBuilder;

mod daemon;
mod extensions;
mod menu;
mod system_tray;
mod window_management;

#[tokio::main]
async fn main() {
  let log_plugin = {
    let targets = [
      LogTarget::LogDir,
      #[cfg(debug_assertions)]
      LogTarget::Stdout,
      // #[cfg(debug_assertions)]
      // LogTarget::Webview,
    ];

    let colors = ColoredLevelConfig::default();

    let filter = std::env::var("RUST_LOG")
      .map(|ref filter| FilterBuilder::new().parse(filter).build().filter())
      .unwrap_or(LevelFilter::Trace);

    LoggerBuilder::new()
      .with_colors(colors)
      .targets(targets)
      .level(filter)
      .build()
  };

  tauri::Builder::default()
    .plugin(log_plugin)
    .plugin(daemon::Plugin::default())
    .plugin(StorePluginBuilder::default().build())
    .plugin(extensions::Plugin::default())
    .menu(menu::get_menu())
    .on_menu_event(menu::event_handler)
    .system_tray(system_tray::get_tray())
    .on_system_tray_event(system_tray::event_handler)
    .setup(|app| {
      daemon::start_daemon(
        app.state::<daemon::Connection>(),
        app.state::<daemon::Flags>(),
      );

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
