use crate::window::{close_all_windows, new_window};
use anyhow::bail;
use log::error;
use tauri::{
  api::shell::open, window::WindowBuilder, CustomMenuItem, Manager, Menu, MenuItem, Submenu,
  WindowMenuEvent, WindowUrl,
};

pub fn get_menu() -> Menu {
  let app_menu = Menu::new()
    .add_item(CustomMenuItem::new("about", "About Mintter"))
    .add_native_item(MenuItem::Separator)
    .add_item(CustomMenuItem::new("preferences", "Preferences...").accelerator("CmdOrControl+,"))
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Hide)
    .add_native_item(MenuItem::HideOthers)
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Quit);

  let file_menu = Menu::new()
    .add_item(CustomMenuItem::new("new_window", "New Window").accelerator("CmdOrControl+N"))
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::CloseWindow)
    .add_item(
      CustomMenuItem::new("close_all_windows", "Close All Windows")
        .accelerator("Alt+Shift+CmdOrControl+W"),
    );

  let edit_menu = Menu::new()
    .add_native_item(MenuItem::Undo)
    .add_native_item(MenuItem::Redo)
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Cut)
    .add_native_item(MenuItem::Copy)
    .add_native_item(MenuItem::Paste)
    .add_native_item(MenuItem::SelectAll);

  let view_menu =
    Menu::new().add_item(CustomMenuItem::new("reload", "Reload").accelerator("CmdOrControl+R"));

  let help_menu = Menu::new()
    .add_item(CustomMenuItem::new("documentation", "Documentation"))
    .add_item(CustomMenuItem::new("release_notes", "Release Notes"))
    .add_item(CustomMenuItem::new("acknowledgements", "Acknowledgements"));

  Menu::new()
    .add_submenu(Submenu::new("Mintter", app_menu))
    .add_submenu(Submenu::new("File", file_menu))
    .add_submenu(Submenu::new("Edit", edit_menu))
    .add_submenu(Submenu::new("View", view_menu))
    .add_submenu(Submenu::new("Help", help_menu))
}

pub fn event_handler(event: WindowMenuEvent) {
  if let Err(err) = event_handler_inner(event) {
    error!("Failed to handle menu event {}", err);
  }
}

pub fn event_handler_inner(event: WindowMenuEvent) -> anyhow::Result<()> {
  match event.menu_item_id() {
    "new_window" => {
      new_window(event.window())?;
    }
    "reload" => {
      event.window().eval("location.reload()")?;
    }
    "close_all_windows" => {
      close_all_windows(event.window())?;
    }
    "documentation" => {
      open(&event.window().shell_scope(), "https://mintter.com", None)?;
    }
    "preferences" => {
      if let Some(window) = event.window().get_window("preferences") {
        window.set_focus()?;
      } else {
        WindowBuilder::new(
          event.window(),
          "preferences",
          WindowUrl::App("/settings".into()),
        )
        .build()?;
      }
    }
    "about" => {
      let app_handle = event.window().app_handle();
      let package_info = app_handle.package_info();
      let message = format!(
        r#"
        {}

        Version: {}
        Commit: {}

        Copyright © 2003-2022 {}.
        All rights reserved.
      "#,
        package_info.description,
        package_info.version,
        std::option_env!("GITHUB_SHA").unwrap_or("N/A"),
        package_info.authors,
      );

      tauri::api::dialog::message(Some(event.window()), &package_info.name, message);
    }
    id => bail!("Unhandled menu item \"{}\"", id),
  }

  Ok(())
}
