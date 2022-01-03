use crate::{Error, Hook, Host, ModuleLoader};
use async_trait::async_trait;
use common::RenderElementProps;
use tracing::instrument;

#[async_trait]
pub trait HostExt {
  async fn render_element(&self, props: &RenderElementProps) -> Result<String, Error>;
}

#[async_trait]
impl<L: ModuleLoader + Sync> HostExt for Host<L> {
  #[instrument(level = "trace")]
  async fn render_element(&self, props: &RenderElementProps) -> Result<String, Error> {
    self.hook_first(Hook::RenderElement, props).await
  }
}
