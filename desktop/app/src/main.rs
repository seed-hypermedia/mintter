#![allow(non_snake_case)]
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod daemon;
mod error;
// mod exts;
mod menu;
mod system_tray;
mod window;
mod window_ext;

// use env_logger::filter::Builder as FilterBuilder;
// use log::LevelFilter;
use tauri::{AppHandle, Manager, Runtime, WindowEvent};
// use tauri_plugin_log::{LogTarget, LoggerBuilder};
// use tauri_plugin_store::PluginBuilder as StorePluginBuilder;
use window_ext::WindowExt as _;

// #[cfg(debug_assertions)]
// use tauri_plugin_log::fern::colors::ColoredLevelConfig;

pub use error::Error;
pub type Result<T> = std::result::Result<T, error::Error>;

#[tauri::command]
#[tracing::instrument(skip(app_handle))]
async fn emit_all<R: Runtime>(
  app_handle: AppHandle<R>,
  event: String,
  payload: Option<String>,
) -> Result<()> {
  app_handle.emit_all(&event, payload).map_err(Into::into)
}

fn main() {
  #[cfg(not(debug_assertions))]
  secmem_proc::harden_process().expect("could not harden process");

  env_logger::init();

  // let log_plugin = {
  //   let targets = [
  //     LogTarget::LogDir,
  //     #[cfg(debug_assertions)]
  //     LogTarget::Stdout,
  //     #[cfg(debug_assertions)]
  //     LogTarget::Webview,
  //   ];

  //   let filter = std::env::var("RUST_LOG")
  //     .map(|ref filter| FilterBuilder::new().parse(filter).build().filter())
  //     .unwrap_or(LevelFilter::Debug);

  //   let builder = LoggerBuilder::new().targets(targets).level(filter);

  //   #[cfg(debug_assertions)]
  //   let builder = builder.with_colors(ColoredLevelConfig::default());

  //   builder.build()
  // };

  tauri::Builder::default()
    // .plugin(log_plugin)
    // .plugin(StorePluginBuilder::default().build())
    .plugin(daemon::init())
    .plugin(window::init())
    // .plugin(exts::init())
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
