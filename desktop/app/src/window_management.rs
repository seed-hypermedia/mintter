use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{window::WindowBuilder, Manager, Runtime, WindowUrl};

pub fn new_window<R: Runtime, M: Manager<R>>(manager: &M) -> tauri::Result<()> {
  let id = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .expect("Failed to construct unix timestamp")
    .as_millis()
    .to_string();

  WindowBuilder::new(manager, id, WindowUrl::App("index.html".into())).build()?;

  Ok(())
}

pub fn close_all_windows<R: Runtime, M: Manager<R>>(manager: &M) -> tauri::Result<()> {
  for window in manager.windows().values() {
    window.close()?;
  }

  Ok(())
}

// pub fn open_in_new_window<R: Runtime, M: Manager<R>>(
//   manager: &M,
//   doc: String,
// ) -> tauri::Result<()> {
//   let id = SystemTime::now()
//     .duration_since(UNIX_EPOCH)
//     .expect("Failed to construct unix timestamp")
//     .as_millis()
//     .to_string();

//   let url = format!("p/{}", doc);

//   WindowBuilder::new(manager, id, WindowUrl::App(url.into())).build()?;

//   Ok(())
// }
