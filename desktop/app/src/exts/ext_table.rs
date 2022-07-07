use std::{fs::ReadDir, path::PathBuf};

/// A filesystem-backed store for wasm modules
#[derive(Debug, Clone)]
pub struct ExtTable {
  dir: PathBuf,
}

impl ExtTable {
  pub fn new(dir: PathBuf) -> Self {
    Self { dir }
  }

  #[tracing::instrument]
  pub async fn get(&self, id: &str) -> crate::Result<Vec<u8>> {
    let path = self.dir.join(id);
    let bytes = tokio::fs::read(path).await?;

    Ok(bytes)
  }

  #[tracing::instrument(skip(bytes))]
  pub async fn install(&self, id: &str, bytes: &[u8]) -> crate::Result<()> {
    let path = self.dir.join(id);
    tokio::fs::write(path, bytes).await?;

    Ok(())
  }

  #[tracing::instrument]
  pub async fn uninstall(&self, id: &str) -> crate::Result<()> {
    let path = self.dir.join(id);
    tokio::fs::remove_file(path).await?;

    Ok(())
  }

  #[tracing::instrument]
  pub async fn clear(&self) -> crate::Result<()> {
    for id in self.ids()? {
      self.uninstall(&id).await?;
    }

    Ok(())
  }

  #[tracing::instrument]
  pub fn exists(&self, id: &str) -> bool {
    let path = self.dir.join(id);

    path.exists()
  }

  #[tracing::instrument]
  pub fn ids(&self) -> crate::Result<Ids> {
    let inner = std::fs::read_dir(&self.dir)?;

    Ok(Ids { inner })
  }
}

pub struct Ids {
  inner: ReadDir,
}

impl Iterator for Ids {
  type Item = String;

  fn next(&mut self) -> Option<Self::Item> {
    let entry = self.inner.next()?.ok()?;

    let file_type = entry.file_type().ok()?;

    if file_type.is_file() || file_type.is_symlink() {
      let name = entry.file_name();
      println!("{:?}", name);
      name.to_str().map(ToString::to_string)
    } else {
      None
    }
  }
}
