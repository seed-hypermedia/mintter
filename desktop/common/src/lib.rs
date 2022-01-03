use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum MenuKind {
  Context,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MenuItem {
  pub title: String,
}

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
  #[serde(rename = "data-slate-inline", default)]
  pub data_slate_inline: bool,
  #[serde(rename = "data-slate-void", default)]
  pub data_slate_void: bool,
  pub dir: Option<String>,
  pub r#ref: JsonValue,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RenderLeafProps {
  pub children: Vec<JsonValue>,
  pub leaf: Text,
  pub text: Text,
  pub attributes: RenderLeafAttributes,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Text {
  pub text: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RenderLeafAttributes {
  #[serde(rename = "data-slate-leaf", default)]
  pub data_slate_leaf: bool,
}
