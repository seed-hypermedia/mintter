use crate::{Error, Hook, Host, ModuleLoader};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use tracing::instrument;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RenderElementProps {
    pub children: Vec<JsonValue>,
    pub element: Element,
    pub attributes: RenderElementAttributes,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Element {
    pub r#type: String,
    pub children: Vec<JsonValue>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RenderElementAttributes {
    #[serde(rename = "data-slate-node")]
    pub data_slate_node: String,
    #[serde(rename = "data-slate-inline")]
    pub data_slate_inline: bool,
    #[serde(rename = "data-slate-void")]
    pub data_slate_void: bool,
    pub dir: Option<String>,
    pub r#ref: JsonValue,
}

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
