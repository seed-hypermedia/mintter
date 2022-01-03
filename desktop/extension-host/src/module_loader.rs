use async_trait::async_trait;
use cap_std::fs::Dir;
use std::{fmt::Debug, io::Read};
use tracing::instrument;

use crate::Error;

#[async_trait]
pub trait ModuleLoader: Debug {
  async fn load(&self, specifier: &str) -> Result<Vec<u8>, Error>;
}

#[derive(Debug)]
/// Placeholder structure used when creating a runtime that doesn’t support module loading.
pub struct NoopModuleLoader;

#[async_trait]
impl ModuleLoader for NoopModuleLoader {
  async fn load(&self, _specifier: &str) -> Result<Vec<u8>, Error> {
    Err(Error::ModuleLoadingDisabled)
  }
}

#[derive(Debug)]
pub struct FsModuleLoader {
  dir: Dir,
}

impl FsModuleLoader {
  pub fn new(dir: Dir) -> Self {
    Self { dir }
  }
}

#[async_trait]
impl ModuleLoader for FsModuleLoader {
  #[instrument(level = "trace")]
  async fn load(&self, specifier: &str) -> Result<Vec<u8>, Error> {
    let mut file = self.dir.open(specifier)?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf)?;
    Ok(buf)
  }
}
