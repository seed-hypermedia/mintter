#![allow(non_snake_case)]
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use env_logger::filter::Builder as FilterBuilder;
use log::LevelFilter;
use tauri::{Manager, WindowEvent};
use tauri_plugin_log::{fern::colors::ColoredLevelConfig, LogTarget, LoggerBuilder};
use tauri_plugin_store::PluginBuilder as StorePluginBuilder;
use window_management::WindowExt;

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
    .invoke_handler(tauri::generate_handler![
      window_management::open_in_new_window
    ])
    .setup(|app| {
      daemon::start_daemon(
        app.state::<daemon::Connection>(),
        app.state::<daemon::Flags>(),
      );

      #[cfg(target_os = "macos")]
      {
        let win = app.get_window("main").unwrap();
        win.set_transparent_titlebar(true);
      }

      Ok(())
    })
    .on_window_event(|event| {
      #[cfg(target_os = "macos")]
      if let WindowEvent::Focused(_) = event.event() {
        if !event.window().is_transparent_titlebar() {
          event.window().set_transparent_titlebar(true);
        }

        if event.window().label() == "preferences" {
          event.window().set_minimizable(false);
          event.window().set_resizable(false).unwrap();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
