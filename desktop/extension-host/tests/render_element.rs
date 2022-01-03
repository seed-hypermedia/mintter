use cap_std::fs::Dir;
use common::{Element, RenderElementAttributes, RenderElementProps};
use extension_host::{hooks::render_element::HostExt, FsModuleLoader, Host};

#[tokio::test]
pub async fn main() -> anyhow::Result<()> {
  tracing_subscriber::fmt::init();
  let dir = Dir::open_ambient_dir("./tests", cap_std::ambient_authority())?;
  let mut host = Host::new(FsModuleLoader::new(dir));

  host.load_extension("./render_element.wasm").await?;

  let props = RenderElementProps {
    children: Vec::new(),
    element: Element {
      r#type: "paragraph".to_string(),
      children: Vec::new(),
    },
    attributes: RenderElementAttributes {
      data_slate_node: "element".to_string(),
      data_slate_inline: true,
      data_slate_void: true,
      dir: Some("rtl".to_string()),
      r#ref: serde_json::Value::Null,
    },
  };

  let html = host.render_element(&props).await?;

  assert_eq!(html, "<p data-slate-node=\"element\" data-slate-inline=\"true\" data-slate-void=\"true\" ref=\"null\" dir=\"rtl\">foobar</p>");

  Ok(())
}
