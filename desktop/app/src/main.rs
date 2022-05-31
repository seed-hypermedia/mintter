#![allow(non_snake_case)]
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use env_logger::filter::Builder as FilterBuilder;
use log::LevelFilter;
use tauri::{AppHandle, Manager, Runtime, WindowEvent};
use tauri_plugin_log::{fern::colors::ColoredLevelConfig, LogTarget, LoggerBuilder};
use tauri_plugin_store::PluginBuilder as StorePluginBuilder;
use window_ext::WindowExt as _;

mod daemon;
// mod extensions;
mod menu;
mod system_tray;
mod window;
mod window_ext;

#[tauri::command]
async fn emit_all<R: Runtime>(
  app_handle: AppHandle<R>,
  event: String,
  payload: Option<String>,
) -> Result<(), String> {
  app_handle
    .emit_all(&event, payload)
    .map_err(|e| e.to_string())
}

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
      .unwrap_or(LevelFilter::Debug);

    LoggerBuilder::new()
      .with_colors(colors)
      .targets(targets)
      .level(filter)
      .build()
  };

  tauri::Builder::default()
    .plugin(log_plugin)
    .plugin(StorePluginBuilder::default().build())
    .plugin(daemon::init())
    .plugin(window::init())
    .menu(menu::get_menu())
    .on_menu_event(menu::event_handler)
    .system_tray(system_tray::get_tray())
    .on_system_tray_event(system_tray::event_handler)
    .invoke_handler(tauri::generate_handler![emit_all])
    .setup(|app| {
      daemon::start_daemon(
        app.state::<daemon::Connection>(),
        app.state::<daemon::Flags>(),
      );

      let win = app.get_window("main").unwrap();
      win.set_transparent_titlebar(true);

      Ok(())
    })
    .on_window_event(|event| {
      if let WindowEvent::Focused(_) = event.event() {
        event.window().set_transparent_titlebar(true);

        if event.window().label() == "preferences" {
          event.window().set_minimizable(false);
          event.window().set_resizable(false).unwrap();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
