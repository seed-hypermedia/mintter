use std::path::PathBuf;

#[async_trait::async_trait]
pub trait ModuleLoader {
  async fn load(&self, module_specifier: &str) -> crate::Result<Vec<u8>>;
}

pub struct FsModuleLoader {
  dir: PathBuf,
}

impl FsModuleLoader {
  pub fn new(dir: PathBuf) -> Self {
    Self { dir }
  }
}

#[async_trait::async_trait]
impl ModuleLoader for FsModuleLoader {
  async fn load(&self, module_specifier: &str) -> crate::Result<Vec<u8>> {
    let path = self.dir.join(module_specifier);

    let bytes = tokio::fs::read(path).await?;

    Ok(bytes)
  }
}
