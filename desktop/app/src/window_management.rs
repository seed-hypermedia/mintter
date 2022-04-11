extern crate objc;
use cocoa::appkit::{NSWindow, NSWindowStyleMask, NSWindowTitleVisibility};
use objc::{class, msg_send, sel, sel_impl};
use std::{
  path::PathBuf,
  time::{SystemTime, UNIX_EPOCH},
};
use tauri::{window::WindowBuilder, Manager, Runtime, Window, WindowUrl};


pub trait WindowExt {
  #[cfg(target_os = "macos")]
  fn set_transparent_titlebar(&self, transparent: bool);
  #[cfg(target_os = "macos")]
  fn is_transparent_titlebar(&self) -> bool;
  #[cfg(target_os = "macos")]
  fn set_closable(&self, closable: bool);
  #[cfg(target_os = "macos")]
  fn set_minimizable(&self, minimizable: bool);
}

impl<R: Runtime> WindowExt for Window<R> {
  #[cfg(target_os = "macos")]
  fn is_transparent_titlebar(&self) -> bool {
    let id = self.ns_window().unwrap() as cocoa::base::id;

    unsafe {
      let style_mask = id.styleMask();

      style_mask.contains(NSWindowStyleMask::NSFullSizeContentViewWindowMask)
    }
  }

  #[cfg(target_os = "macos")]
  fn set_transparent_titlebar(&self, transparent: bool) {
    unsafe {
      let id = self.ns_window().unwrap() as cocoa::base::id;

      let mut style_mask = id.styleMask();
      style_mask.set(
        NSWindowStyleMask::NSFullSizeContentViewWindowMask,
        transparent,
      );
      id.setStyleMask_(style_mask);

      id.setTitleVisibility_(if transparent {
        NSWindowTitleVisibility::NSWindowTitleHidden
      } else {
        NSWindowTitleVisibility::NSWindowTitleVisible
      });

      id.setTitlebarAppearsTransparent_(if transparent {
        cocoa::base::YES
      } else {
        cocoa::base::NO
      });

      let toolbar_cls = class!(NSToolbar);
      let toolbar: cocoa::base::id = msg_send![toolbar_cls, new];
      id.setToolbar_(toolbar);
    }
  }

  #[cfg(target_os = "macos")]
  fn set_closable(&self, closable: bool) {
    unsafe {
      let id = self.ns_window().unwrap() as cocoa::base::id;

      let mut style_mask = id.styleMask();
      style_mask.set(NSWindowStyleMask::NSClosableWindowMask, closable);
      id.setStyleMask_(style_mask);
    }
  }

  #[cfg(target_os = "macos")]
  fn set_minimizable(&self, minimizable: bool) {
    unsafe {
      let id = self.ns_window().unwrap() as cocoa::base::id;

      let mut style_mask = id.styleMask();
      style_mask.set(NSWindowStyleMask::NSMiniaturizableWindowMask, minimizable);
      id.setStyleMask_(style_mask);
    }
  }
}

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
