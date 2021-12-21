use cap_std::fs::Dir;
use extension_host::{hooks::menu::HostExt, FsModuleLoader, Host, MenuItem, MenuKind};
use tracing_subscriber;

#[tokio::test]
pub async fn main() -> anyhow::Result<()> {
  tracing_subscriber::fmt::init();
  let dir = Dir::open_ambient_dir("./tests", cap_std::ambient_authority())?;
  let mut host = Host::new(FsModuleLoader::new(dir));

  host.load_extension("./menu.wasm").await?;

  let menu_items = host.menu(&MenuKind::Context).await?;

  assert_eq!(
    menu_items,
    vec![MenuItem {
      title: "foobar".to_string()
    }]
  );

  Ok(())
}
