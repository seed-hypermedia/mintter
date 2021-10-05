use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

pub fn get_menu() -> Menu {
  let app_menu = Menu::new()
    .add_item(CustomMenuItem::new("about", "About Mintter"))
    .add_native_item(MenuItem::Separator)
    .add_item(CustomMenuItem::new("preferences", "Preferences...").accelerator("CmdOrControl+P"))
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Hide)
    .add_native_item(MenuItem::HideOthers)
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Quit);

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
    .add_submenu(Submenu::new("My App", app_menu))
    .add_submenu(Submenu::new("Edit", edit_menu))
    .add_submenu(Submenu::new("View", view_menu))
    .add_submenu(Submenu::new("Help", help_menu))
}
