use serde::Serialize;

// All possible errors that can happen in the app. 
#[derive(Debug, thiserror::Error)]
pub enum Error {
  #[error("JSON: {0}")]
  Json(#[from] serde_json::Error),
  #[error(transparent)]
  Utf8(#[from] std::string::FromUtf8Error),
  #[error(transparent)]
  Io(#[from] std::io::Error),
  #[error("Module loading is disabled")]
  ModuleLoadingDisabled,
  #[error("Failed to parse extensions metadata")]
  MetadataParsing,
  #[error("Failed to parse extensions exports")]
  ExportsParsing,
  #[error("Extension not found")]
  NotFound,
  #[error("Malformed specifier")]
  InvalidSpecifier,
  #[error(transparent)]
  Tauri(#[from] tauri::Error),
  #[error("Failed to get the current monitor")]
  MonitorNotFound,
  #[error(transparent)]
  Other(#[from] anyhow::Error),
  #[error(transparent)]
  Version(#[from] semver::Error),
  // #[error("WASM Trap: {0}")]
  // Trap(#[from] wasmtime::Trap),
  // #[error("Worker got terminated")]
  // Aborted(#[from] futures_util::future::Aborted),
}

// A very crude implementation of `Serialize` for the error just so we can pass it to the frontend. 
// In the future it maybe makes sense to serialize this into a structured format that the frontend can make sense of.
impl Serialize for Error {
  fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
  where
    S: serde::Serializer,
  {
    serializer.serialize_str(self.to_string().as_ref())
  }
}
