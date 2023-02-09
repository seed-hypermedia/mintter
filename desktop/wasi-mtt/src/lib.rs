mod ctx;
mod error;
mod r#impl;

use tauri::Runtime;
use wasmtime::component::Linker;

pub use ctx::Context;
pub use error::Error;
pub(crate) use error::{ErrorExt, ErrorKind};
pub type Result<T> = std::result::Result<T, error::Error>;
pub use r#impl::{pledge::pledge::Promises, Client};

pub fn add_to_linker<T, R: Runtime>(
  linker: &mut Linker<T>,
  get_cx: impl Fn(&mut T) -> &mut crate::Context<R> + Send + Sync + Copy + 'static,
) -> anyhow::Result<()>
where
  T: Send,
{
  r#impl::log::log::add_to_linker(linker, get_cx)?;
  r#impl::poll::poll::add_to_linker(linker, get_cx)?;
  r#impl::fetch::fetch::add_to_linker(linker, get_cx)?;
  r#impl::pledge::pledge::add_to_linker(linker, get_cx)?;

  Ok(())
}
