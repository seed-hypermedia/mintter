use std::os::raw::c_char;

#[cfg(target_os = "macos")]
use cocoa::appkit::{NSWindow, NSWindowStyleMask, NSWindowTitleVisibility};
use objc::runtime::Object;
#[cfg(target_os = "macos")]
use objc::{class, msg_send, sel, sel_impl};
use tauri::{Window, Wry};
use url::Url;

const UTF8_ENCODING: usize = 4;

pub trait WindowExt {
  fn set_transparent_titlebar(&self, transparent: bool);
  fn is_transparent_titlebar(&self) -> bool;
  fn set_closable(&self, closable: bool);
  fn set_minimizable(&self, minimizable: bool);
  fn url(&self) -> tauri::Result<Url>;
}

impl WindowExt for Window<Wry> {
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

  #[cfg(not(target_os = "macos"))]
  fn set_transparent_titlebar(&self, _transparent: bool) {}

  #[cfg(target_os = "macos")]
  fn is_transparent_titlebar(&self) -> bool {
    let id = self.ns_window().unwrap() as cocoa::base::id;

    unsafe {
      let style_mask = id.styleMask();

      style_mask.contains(NSWindowStyleMask::NSFullSizeContentViewWindowMask)
    }
  }

  #[cfg(not(target_os = "macos"))]
  fn is_transparent_titlebar(&self) -> bool {
    false
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

  #[cfg(not(target_os = "macos"))]
  fn set_closable(&self, _closable: bool) {}

  #[cfg(target_os = "macos")]
  fn set_minimizable(&self, minimizable: bool) {
    unsafe {
      let id = self.ns_window().unwrap() as cocoa::base::id;

      let mut style_mask = id.styleMask();
      style_mask.set(NSWindowStyleMask::NSMiniaturizableWindowMask, minimizable);
      id.setStyleMask_(style_mask);
    }
  }

  #[cfg(not(target_os = "macos"))]
  fn set_minimizable(&self, _minimizable: bool) {}

  fn url(&self) -> tauri::Result<Url> {
    let (tx, rx) = std::sync::mpsc::channel::<&str>();

    self.with_webview(move |webview| {
      let url_obj: *mut Object = unsafe { msg_send![webview.inner(), URL] };
      let absolute_url: *mut Object = unsafe { msg_send![url_obj, absoluteString] };

      let bytes = {
        let bytes: *const c_char = unsafe { msg_send![absolute_url, UTF8String] };
        bytes as *const u8
      };
      let len = unsafe { msg_send![absolute_url, lengthOfBytesUsingEncoding: UTF8_ENCODING] };
      let bytes = unsafe { std::slice::from_raw_parts(bytes, len) };

      tx.send(std::str::from_utf8(bytes).unwrap()).unwrap();
    })?;

    let str = rx.recv().expect("Failed to receive string pointer");
    Url::parse(str).map_err(tauri::Error::InvalidUrl)
  }
}
