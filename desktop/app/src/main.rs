#![allow(non_snake_case)]
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use env_logger::filter::Builder as FilterBuilder;
use tauri::Manager;
use tauri_plugin_log::{fern::colors::ColoredLevelConfig, LogTarget, LoggerBuilder};
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

    let colors = ColoredLevelConfig::default();

    let mut builder = FilterBuilder::new();

    // Parse a directives string from an environment variable
    if let Ok(ref filter) = std::env::var("RUST_LOG") {
      builder.parse(filter);
    }

    LoggerBuilder::new()
      .with_colors(colors)
      .targets(targets)
      .level(builder.build().filter())
      .build()
  };

  tauri::Builder::default()
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
    .on_system_tray_event(system_tray::event_handler)
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
