use tauri::{Runtime, Window};

pub struct MttCtx<R: Runtime> {
  pub(crate) window: Window<R>,
}

impl<R: Runtime> MttCtx<R> {
  pub fn new(window: Window<R>) -> Self {
    Self { window }
  }
}
