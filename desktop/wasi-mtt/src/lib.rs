mod ctx;
mod error;
mod r#impl;
pub(crate) mod witx;

pub use ctx::MttCtx;
pub use error::{Error, ErrorExt};
use tauri::Runtime;
use wasmtime::Linker;
pub type Result<T> = std::result::Result<T, error::Error>;

pub fn add_to_linker<T, R: Runtime>(
  linker: &mut Linker<T>,
  get_cx: impl Fn(&mut T) -> &mut crate::MttCtx<R> + Send + Sync + Copy + 'static,
) -> anyhow::Result<()>
where
  T: Send,
{
  witx::mtt_ephemeral_poll::add_to_linker(linker, get_cx)?;
  Ok(())
}
