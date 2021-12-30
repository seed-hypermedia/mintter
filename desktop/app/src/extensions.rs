use cap_std::{ambient_authority, fs::Dir};
use common::{MenuItem, MenuKind, RenderElementProps, RenderLeafProps};
use extension_host::{FsModuleLoader, Host};
use std::sync::Arc;
use tauri::{plugin::Plugin as TauriPlugin, Invoke, Manager, Runtime, State};
use tokio::sync::Mutex;

pub struct PluginHostWrapper(Arc<Mutex<Host<FsModuleLoader>>>);

#[tauri::command]
async fn load_extension<R: Runtime>(
  _app: tauri::AppHandle<R>,
  host: State<'_, PluginHostWrapper>,
  specifier: String,
) -> Result<(), String> {
  let mut host = host.0.lock().await;

  host
    .load_extension(&specifier)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn menu<R: Runtime>(
  _app: tauri::AppHandle<R>,
  host: State<'_, PluginHostWrapper>,
  kind: MenuKind,
) -> Result<Vec<MenuItem>, String> {
  use extension_host::hooks::menu::HostExt;

  let host = host.0.lock().await;

  host.menu(&kind).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn render_element<R: Runtime>(
  _app: tauri::AppHandle<R>,
  host: State<'_, PluginHostWrapper>,
  props: RenderElementProps,
) -> Result<String, String> {
  use extension_host::hooks::render_element::HostExt;

  let host = host.0.lock().await;

  host.render_element(&props).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn render_leaf<R: Runtime>(
  _app: tauri::AppHandle<R>,
  host: State<'_, PluginHostWrapper>,
  props: RenderLeafProps,
) -> Result<String, String> {
  use extension_host::hooks::render_leaf::HostExt;

  let host = host.0.lock().await;

  host.render_leaf(&props).await.map_err(|e| e.to_string())
}

pub struct Plugin<R: Runtime> {
  invoke_handler: Box<dyn Fn(Invoke<R>) + Send + Sync>,
}

impl<R: Runtime> Default for Plugin<R> {
  fn default() -> Self {
    Self {
      invoke_handler: Box::new(tauri::generate_handler![
        load_extension,
        menu,
        render_element,
        render_leaf
      ]),
    }
  }
}

impl<R: Runtime> TauriPlugin<R> for Plugin<R> {
  fn name(&self) -> &'static str {
    "extensions"
  }

  fn initialize(
    &mut self,
    app: &tauri::AppHandle<R>,
    _: serde_json::Value,
  ) -> tauri::plugin::Result<()> {
    // let mut app_dir = app.path_resolver().app_dir().unwrap();
    // app_dir.push("extensions");

    // std::fs::create_dir_all(app_dir.clone()).unwrap();

    // debug!("extension dir {:?}", app_dir);

    let dir = Dir::open_ambient_dir(
      "/Users/jonaskruckenberg/Documents/GitHub/mintter/target/wasm32-wasi/debug",
      ambient_authority(),
    )?;
    let host = Host::new(FsModuleLoader::new(dir));

    app.manage(PluginHostWrapper(Arc::new(Mutex::new(host))));

    Ok(())
  }

  /// Extend the invoke handler.
  fn extend_api(&mut self, message: Invoke<R>) {
    (self.invoke_handler)(message)
  }
}
