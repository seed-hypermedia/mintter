use cap_std::{ambient_authority, fs::Dir};
use common::{MenuItem, MenuKind, RenderElementProps, RenderLeafProps};
use extension_host::{FsModuleLoader, Host};
use log::info;
use std::sync::Arc;
use tauri::{
  plugin::{Builder as PluginBuilder, TauriPlugin},
  Invoke, Manager, Runtime, State,
};
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

pub fn init<R: Runtime>() -> TauriPlugin<R> {
  PluginBuilder::new("extensions")
    .invoke_handler(tauri::generate_handler![
      load_extension,
      menu,
      render_element,
      render_leaf
    ])
    .setup(|app_handle| {
      let mut app_dir = app_handle.path_resolver().app_dir().unwrap();
      app_dir.push("extensions");

      std::fs::create_dir_all(app_dir.clone()).unwrap();

      info!("extension dir {:?}", app_dir);

      let dir = Dir::open_ambient_dir(app_dir, ambient_authority())?;
      let host = Host::new(FsModuleLoader::new(dir));

      app_handle.manage(PluginHostWrapper(Arc::new(Mutex::new(host))));

      Ok(())
    })
    .build()
}
