use std::borrow::Cow;
use tauri::{Window, Wry};
use url::Url;

#[cfg(target_os = "macos")]
use cocoa::appkit::{NSWindow, NSWindowStyleMask, NSWindowTitleVisibility};
#[cfg(target_os = "macos")]
use objc::{class, msg_send, runtime::Object, sel, sel_impl};
#[cfg(target_os = "macos")]
use std::os::raw::c_char;

#[cfg(target_os = "linux")]
use webkit2gtk::traits::WebViewExt;

#[cfg(windows)]
use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2;
#[cfg(windows)]
use windows::core::PWSTR;

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
    let (tx, rx) = std::sync::mpsc::channel::<Cow<'_, str>>();

    self.with_webview(move |webview| {
      #[cfg(target_os = "linux")]
      {
        let uri = webview.inner().uri().unwrap();
        tx.send(uri.as_str().into()).unwrap();
      }

      #[cfg(windows)]
      {
        let mut buffer: Vec<u16> = Vec::with_capacity(257);

        let mut pwstr = PWSTR(buffer.as_mut_ptr());

        let webview = unsafe { webview.controller().CoreWebView2().unwrap() };
        unsafe { webview.Source(&mut pwstr).unwrap() };

        let uri = take_pwstr(pwstr);

        tx.send(uri.into()).unwrap();
      }

      #[cfg(target_os = "macos")]
      {
        let url_obj: *mut Object = unsafe { msg_send![webview.inner(), URL] };
        let absolute_url: *mut Object = unsafe { msg_send![url_obj, absoluteString] };

        let bytes = {
          let bytes: *const c_char = unsafe { msg_send![absolute_url, UTF8String] };
          bytes as *const u8
        };

        // 4 represents utf8 encoding
        let len = unsafe { msg_send![absolute_url, lengthOfBytesUsingEncoding: 4] };
        let bytes = unsafe { std::slice::from_raw_parts(bytes, len) };

        tx.send(String::from_utf8_lossy(bytes)).unwrap();
      }
    })?;

    let str = rx.recv().expect("Failed to receive string pointer");
    Url::parse(&str).map_err(tauri::Error::InvalidUrl)
  }
}
