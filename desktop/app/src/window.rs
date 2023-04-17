/// This module defines functions that are relevant for window management.
use crate::window_ext::WindowExt;
use crate::Result;
use log::debug;
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

/// This command is called by the frontend when the user clicks to open a new window.
/// If a window with the given document is already opened it will be focused instead.
#[tauri::command]
#[tracing::instrument(skip(window))]
async fn open(window: Window, path: &str) -> Result<()> {
  for (_, win) in window.windows() {
    let win_url = win.url()?;

    let requested_url = {
      let mut url = win_url.clone();
      url.set_path(path);
      url
    };

    // only compare the url path, ignore query and hash for window identity
    let left = win_url.path_segments().unwrap();
    let right = requested_url.path_segments().unwrap();

    debug!(
      "comparing win url {:?}  to requested {:?}, equal: {}",
      left.clone().collect::<Vec<_>>(),
      right.clone().collect::<Vec<_>>(),
      left.clone().eq(right.clone())
    );
    if left.eq(right) {
      // there's a window with the actual document opened
      win.emit("update_focus_window_route", path)?;
      return win.set_focus().map_err(Into::into);
    }
  }

  // lets construct a new window
  let label = window_label();

  let win = WindowBuilder::new(&window, label, WindowUrl::App(path.into()))
    .title("Mintter")
    .disable_file_drop_handler()
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

/// This command explicitly creates a new window, fully bypassing the window focusing behavior.
/// This is used when the user wants to explicitly open something in a new window.
#[tauri::command(async)]
#[tracing::instrument(skip(window))]
pub fn new_window<R: Runtime>(window: Window<R>) -> Result<()> {
  let label = window_label();

  let win = WindowBuilder::new(&window, label, WindowUrl::App("index.html".into()))
    .title("Mintter")
    .disable_file_drop_handler()
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

/// This command is used by the menus to let the user close all open windows at once.
#[tauri::command(async)]
#[tracing::instrument(skip(app_handle))]
pub fn close_all_windows<R: Runtime>(app_handle: AppHandle<R>) -> Result<()> {
  for window in app_handle.windows().values() {
    window.close()?;
  }

  Ok(())
}

/// Window labels must be unique, so we generate a cheap unique-enough label here by taking the current time in milliseconds.
#[inline]
fn window_label() -> String {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .expect("Failed to construct unix timestamp")
    .as_millis()
    .to_string()
}

/// This function calculates the position of a new window based in the position of it's parent window.
///
/// This is used to avoif created window completely on top of one another when repeatedly clicking the open window button.
/// This replicates the default behavior of of macOS as closley as possible.
fn get_new_position<R: Runtime>(window: &Window<R>) -> Result<(f64, f64)> {
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
