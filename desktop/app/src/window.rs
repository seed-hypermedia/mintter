use crate::window_ext::WindowExt;
use log::debug;
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{
  plugin::{Builder as PluginBuilder, TauriPlugin},
  AppHandle, Manager, Runtime, WindowBuilder, WindowUrl, Wry,
};

#[derive(Debug, thiserror::Error)]
enum Error {
  #[error(transparent)]
  Tauri(#[from] tauri::Error),
}

impl Serialize for Error {
  fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
  where
    S: serde::Serializer,
  {
    serializer.serialize_str(&self.to_string())
  }
}

#[tauri::command]
#[tracing::instrument(skip(app_handle))]
async fn open(app_handle: AppHandle, path: &str) -> Result<(), Error> {
  for (_, win) in app_handle.windows() {
    let win_url = win.url()?;

    let requested_url = {
      let mut url = win_url.clone();
      url.set_path(path);
      url
    };

    let left = win_url.path_segments().unwrap().take(2);
    let right = requested_url.path_segments().unwrap().take(2);

    debug!(
      "comparing win url {:?}  to requested {:?}, equal: {}",
      left.clone().collect::<Vec<_>>(),
      right.clone().collect::<Vec<_>>(),
      left.clone().eq(right.clone())
    );
    if left.eq(right) {
      return win.set_focus().map_err(Into::into);
    }
  }

  let label = window_label();

  let win = WindowBuilder::new(&app_handle, label, WindowUrl::App(path.into()))
    .title("Mintter")
    .min_inner_size(500.0, 500.0);

  #[cfg(not(target_os = "macos"))]
  let win = { win.decorations(false) };

  win.build()?;

  Ok(())
}

#[tauri::command(async)]
#[tracing::instrument(skip(app_handle))]
pub fn new_window<R: Runtime>(app_handle: AppHandle<R>) -> tauri::Result<()> {
  let label = window_label();

  let win = WindowBuilder::new(&app_handle, label, WindowUrl::App("index.html".into()))
    .title("Mintter")
    .min_inner_size(500.0, 500.0);

  #[cfg(not(target_os = "macos"))]
  let win = { win.decorations(false) };

  win.build()?;

  Ok(())
}

#[tauri::command(async)]
#[tracing::instrument(skip(app_handle))]
pub fn close_all_windows<R: Runtime>(app_handle: AppHandle<R>) -> tauri::Result<()> {
  for window in app_handle.windows().values() {
    window.close()?;
  }

  Ok(())
}

fn window_label() -> String {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .expect("Failed to construct unix timestamp")
    .as_millis()
    .to_string()
}

pub fn init() -> TauriPlugin<Wry> {
  PluginBuilder::new("window")
    .invoke_handler(tauri::generate_handler![open])
    .build()
}
