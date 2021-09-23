#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::async_runtime::Receiver;
use tauri::{
  api::process::{Command, CommandChild, CommandEvent},
  CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
};
mod menu;

type Daemon = (Receiver<CommandEvent>, CommandChild);

fn start_daemon() -> Daemon {
  Command::new_sidecar("mintterd")
    .expect("failed to create `my-sidecar` binary command")
    .spawn()
    .expect("Failed to spawn sidecar")
}

fn main() {
  tauri::Builder::default()
    .manage(start_daemon())
    .menu(menu::get_menu())
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
            let daemon = app.try_state::<Daemon>();

            if daemon.is_none() {
              println!("should start daemon");
            } else {
              println!("daemon already started");
            }
          }
          "stop" => {
            let daemon = app.try_state::<Daemon>();

            if daemon.is_none() {
              println!("daemon already stopped");
            } else {
              println!("should stop daemon");
            }
          }
          _ => {}
        }
      }
      _ => {}
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
