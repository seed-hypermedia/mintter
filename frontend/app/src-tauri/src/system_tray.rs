use crate::daemon;
use tauri::Manager;
use tauri::{AppHandle, SystemTrayEvent};
use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu};

#[cfg(target_os = "macos")]
pub fn get_tray() -> SystemTray {
  let tray = SystemTray::new();
  let tray_menu = SystemTrayMenu::new();

  #[cfg(target_os = "macos")]
  let tray_menu = tray_menu.add_item(
    CustomMenuItem::new("status", "Online").native_image(tauri::NativeImage::StatusAvailable),
  );

  #[cfg(not(target_os = "macos"))]
  let tray_menu = tray_menu.add_item(CustomMenuItem::new("status", "Online"));

  let tray_menu = tray_menu
    .add_item(CustomMenuItem::new("start", "Start Daemon"))
    .add_item(CustomMenuItem::new("stop", "Stop Daemon"))
    .add_item(CustomMenuItem::new("exit_app", "Quit"));

  tray.with_menu(tray_menu)
}

#[cfg(target_os = "macos")]
pub fn event_handler(app: &AppHandle, event: SystemTrayEvent) {
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

        #[cfg(target_os = "macos")]
        status_handle
          .set_native_image(tauri::NativeImage::StatusAvailable)
          .unwrap();
      }
      "stop" => {
        daemon::stop_daemon(app.state::<daemon::Connection>());
        let item_handle = app.tray_handle().get_item("status");

        item_handle.set_title("Offline").unwrap();

        #[cfg(target_os = "macos")]
        item_handle
          .set_native_image(tauri::NativeImage::StatusNone)
          .unwrap();
      }
      _ => {}
    }
  }
}
