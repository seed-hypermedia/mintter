mod extension;
pub mod hooks;
mod host;
mod module_loader;

pub use extension::Extension;
pub use hooks::Hook;
pub use host::Host;
pub use module_loader::{FsModuleLoader, ModuleLoader, NoopModuleLoader};

#[derive(Debug, thiserror::Error)]
pub enum Error {
  #[error("No hooks found")]
  NotFound,
  #[error("JSON: {0}")]
  Json(#[from] serde_json::Error),
  #[error("Failed to initialize hook")]
  HookInitialization(wasmtime::Trap),
  #[error("Failed to execute hook")]
  HookExecution(wasmtime::Trap),
  #[error(transparent)]
  Other(#[from] anyhow::Error),
  #[error(transparent)]
  Utf8(#[from] std::string::FromUtf8Error),
  #[error("Unknown hook: {0}")]
  UnknownHook(String),
  #[error(transparent)]
  Io(#[from] std::io::Error),
  #[error("Module loading is disabled")]
  ModuleLoadingDisabled,
}
