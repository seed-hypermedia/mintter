use crate::{Error, Hook, Host, ModuleLoader};
use async_trait::async_trait;
use common::RenderLeafProps;
use serde_json::Value as JsonValue;
use tracing::instrument;

#[async_trait]
pub trait HostExt {
  async fn render_leaf(&self, props: &RenderLeafProps) -> Result<String, Error>;
}

#[async_trait]
impl<L: ModuleLoader + Sync> HostExt for Host<L> {
  #[instrument(level = "trace")]
  async fn render_leaf(&self, props: &RenderLeafProps) -> Result<String, Error> {
    self
      .hook_fold(Hook::RenderLeaf, props, |rtn: String| -> RenderLeafProps {
        RenderLeafProps {
          children: vec![JsonValue::String(rtn)],
          ..props.clone()
        }
      })
      .await
  }
}
