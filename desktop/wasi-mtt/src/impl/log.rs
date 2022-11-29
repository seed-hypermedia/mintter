use super::pledge::contains;
use crate::{Context, Promises};
use tauri::Runtime;
use wit_bindgen_host_wasmtime_rust::Result as HostResult;

wit_bindgen_host_wasmtime_rust::generate!({
    tracing: true,
    import: "./wit/log.wit",
    name: "log",
});

impl<R: Runtime> log::Log for Context<R> {
  fn log(&mut self, level: log::LogLevel, str: String) -> HostResult<(), log::Error> {
    if !contains(self.promises, Promises::STDIO) {
      Err(log::Error::Perm)?
    }

    match level {
      log::LogLevel::Trace => ::log::trace!("{}", str),
      log::LogLevel::Debug => ::log::debug!("{}", str),
      log::LogLevel::Info => ::log::info!("{}", str),
      log::LogLevel::Warn => ::log::warn!("{}", str),
      log::LogLevel::Error => ::log::error!("{}", str),
    }

    Ok(())
  }
}
