use crate::window_ext::WindowExt;
use log::debug;
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{
  plugin::{Builder as PluginBuilder, TauriPlugin},
  AppHandle, Manager, Runtime, Window, WindowBuilder, WindowUrl, Wry,
};

const DEFAULT_WINDOW_WIDTH: f64 = 1000.0;
const DEFAULT_WINDOW_HEIGHT: f64 = 800.0;
const DEFAULT_MIN_WINDOW_WIDTH: f64 = 640.0;
const DEFAULT_MIN_WINDOW_HEIGHT: f64 = 480.0;
const DEFAULT_OFFSET: f64 = 64.0;

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
#[tracing::instrument(skip(window))]
async fn open(window: Window, path: &str) -> Result<(), Error> {
  for (_, win) in window.windows() {
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

  let win = WindowBuilder::new(&window, label, WindowUrl::App(path.into()))
    .title("Mintter")
    .inner_size(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT)
    .min_inner_size(DEFAULT_MIN_WINDOW_WIDTH, DEFAULT_MIN_WINDOW_HEIGHT);

  let win = if let Ok((x, y)) = get_new_position(&window) {
    win.position(x, y)
  } else {
    win
  };

  #[cfg(not(target_os = "macos"))]
  let win = { win.decorations(false) };

  win.build()?;

  Ok(())
}

#[tauri::command(async)]
#[tracing::instrument(skip(window))]
pub fn new_window<R: Runtime>(window: Window<R>) -> tauri::Result<()> {
  let label = window_label();

  let win = WindowBuilder::new(&window, label, WindowUrl::App("index.html".into()))
    .title("Mintter")
    .inner_size(DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT)
    .min_inner_size(DEFAULT_MIN_WINDOW_WIDTH, DEFAULT_MIN_WINDOW_HEIGHT);

  let win = if let Ok((x, y)) = get_new_position(&window) {
    win.position(x, y)
  } else {
    win
  };

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

fn get_new_position<R: Runtime>(window: &Window<R>) -> crate::Result<(f64, f64)> {
  let current_pos = window.outer_position()?;
  let current_monitor = window
    .current_monitor()?
    .ok_or(crate::Error::MonitorNotFound)?;
  let new_x = {
    let desired_space = current_pos.x as f64 + DEFAULT_WINDOW_WIDTH;

    if current_monitor.size().width as f64 > desired_space {
      current_pos.x as f64 + DEFAULT_OFFSET
    } else {
      DEFAULT_OFFSET
    }
  };

  let new_y = {
    let desired_space = current_pos.y as f64 + DEFAULT_WINDOW_HEIGHT;
    if current_monitor.size().height as f64 > desired_space {
      current_pos.y as f64 + DEFAULT_OFFSET
    } else {
      DEFAULT_OFFSET
    }
  };

  Ok((new_x, new_y))
}

pub fn init() -> TauriPlugin<Wry> {
  PluginBuilder::new("window")
    .invoke_handler(tauri::generate_handler![open])
    .build()
}
