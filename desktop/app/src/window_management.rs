use std::{
  path::PathBuf,
  time::{SystemTime, UNIX_EPOCH},
};
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

#[tauri::command]
pub async fn open_in_new_window<R: Runtime>(
  app: tauri::AppHandle<R>,
  url: PathBuf,
) -> Result<(), String> {
  let id = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .expect("Failed to construct unix timestamp")
    .as_millis()
    .to_string();

  WindowBuilder::new(&app, id, WindowUrl::App(url))
    .build()
    .map_err(|err| err.to_string())?;

  Ok(())
}
