use crate::daemon;
use tauri::{
  AppHandle, CustomMenuItem, Manager, Runtime, SystemTray, SystemTrayEvent, SystemTrayMenu,
};

pub fn get_tray() -> SystemTray {
  let tray = SystemTray::new();
  let tray_menu = SystemTrayMenu::new();

  let tray_menu = tray_menu
    .add_item(CustomMenuItem::new("start", "Start Daemon"))
    .add_item(CustomMenuItem::new("stop", "Stop Daemon"))
    .add_item(CustomMenuItem::new("exit_app", "Quit"));

  tray.with_menu(tray_menu)
}

pub fn event_handler<R: Runtime>(app_handle: &AppHandle<R>, event: SystemTrayEvent) {
  if let SystemTrayEvent::MenuItemClick { id, .. } = event {
    match id.as_str() {
      "exit_app" => {
        // exit the app
        app_handle.exit(0);
      }
      "start" => {
        daemon::start_daemon(
          app_handle.clone(),
          app_handle.state::<daemon::Connection>(),
          app_handle.state::<daemon::Flags>(),
          app_handle.state::<sentry::ClientOptions>(),
        );
      }
      "stop" => {
        daemon::stop_daemon(app_handle.state::<daemon::Connection>());
      }
      _ => {}
    }
  }
}
