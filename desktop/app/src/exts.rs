mod ext_table;
mod metadata;
mod module_loader;

use ext_table::ExtTable;
use futures_util::future::{AbortHandle, Abortable};
use metadata::Metadata;
use module_loader::{FsModuleLoader, ModuleLoader};
use std::{collections::HashMap, path::PathBuf, sync::Arc, time::Duration};
use tauri::{
  plugin::{self, TauriPlugin},
  Manager, Runtime, State, Window,
};
use tokio::sync::Mutex;
use tracing::debug;
use wasmtime::{
  component::{Component, Linker},
  Config, Engine, Module, Store,
};

#[tauri::command]
#[tracing::instrument(skip(engine, fs_loader, ext_table))]
async fn install(
  engine: State<'_, Engine>,
  fs_loader: State<'_, FsModuleLoader>,
  ext_table: State<'_, ExtTable>,
  specifier: &str,
) -> crate::Result<String> {
  debug!("Loading wasm bytes...");
  let bytes = fs_loader.load(specifier).await?;

  debug!("Parsing extension metadata...");
  let metadata = Metadata::parse(&bytes)?;
  debug!(meta = ?metadata, "Found valid extension metadata");

  debug!("Validating wasm module...");
  Module::validate(&engine, &bytes)?;
  debug!("Valid wasm module");

  debug!("Inserting extension into ext_table...");
  let id = format!("{}@{}", metadata.name(), metadata.version());
  ext_table.install(&id, &bytes).await?;

  Ok(id)
}

#[tauri::command]
#[tracing::instrument(skip(ext_table, wk_table))]
async fn uninstall(
  ext_table: State<'_, ExtTable>,
  wk_table: State<'_, WorkerTable>,
  id: &str,
) -> crate::Result<()> {
  terminate(wk_table, id).await?;

  debug!("Removing extension from ext_table...");
  ext_table.uninstall(id).await?;

  Ok(())
}

#[tauri::command]
#[tracing::instrument(skip(ext_table))]
fn exists(ext_table: State<'_, ExtTable>, id: &str) -> bool {
  ext_table.exists(id)
}

#[tauri::command]
#[tracing::instrument(skip(ext_table))]
async fn metadata(ext_table: State<'_, ExtTable>, id: &str) -> crate::Result<Metadata> {
  debug!("Getting wasm bytes...");
  let bytes = ext_table.get(id).await?;

  debug!("Parsing extension metadata...");
  let metadata = Metadata::parse(&bytes)?;
  debug!(meta = ?metadata, "Found valid extension metadata");

  Ok(metadata)
}

#[tauri::command]
#[tracing::instrument(skip(ext_table))]
async fn clear(ext_table: State<'_, ExtTable>) -> crate::Result<()> {
  ext_table.clear().await?;

  Ok(())
}

#[tauri::command]
#[tracing::instrument(skip(ext_table))]
async fn ids(ext_table: State<'_, ExtTable>) -> crate::Result<Vec<String>> {
  let keys = ext_table.ids()?.collect();

  Ok(keys)
}

struct Context<R: Runtime> {
  mtt: wasi_mtt::Context<R>,
  // wasi: WasiCtx,
}

#[derive(Debug)]
struct Worker {
  abort_handle: AbortHandle,
}

#[derive(Debug, Default)]
struct WorkerTable(Arc<Mutex<HashMap<String, Worker>>>);

#[tauri::command]
// #[tracing::instrument(skip(engine, ext_table, wk_table, window))]
async fn instantiate<R: Runtime>(
  window: Window<R>,
  engine: State<'_, Engine>,
  ext_table: State<'_, ExtTable>,
  wk_table: State<'_, WorkerTable>,
  id: String,
) -> crate::Result<()> {
  let (abort_handle, abort_registration) = AbortHandle::new_pair();

  let future = Abortable::new(
    instantiate_inner(window, engine, ext_table, &id),
    abort_registration,
  );

  debug!("Inserting worker into wk_table...");
  let mut wk_table = wk_table.0.lock().await;
  wk_table.insert(id.to_string(), Worker { abort_handle });

  drop(wk_table);

  future.await?
}

async fn instantiate_inner<R: Runtime>(
  window: Window<R>,
  engine: State<'_, Engine>,
  ext_table: State<'_, ExtTable>,
  id: &str,
) -> crate::Result<()> {
  debug!("Loading bytes...");
  let bytes = ext_table.get(id).await?;

  debug!("Parsing WASM component...");
  let component = Component::from_binary(&engine, &bytes)?;

  debug!("Setting up worker linking context...");
  let mut linker: Linker<Context<R>> = Linker::new(&engine);

  // now we add all available host APIs to the linker.
  // wasmtime_wasi::add_to_linker(&mut linker, |cx| &mut cx.wasi)?;
  wasi_mtt::add_to_linker(&mut linker, |cx: &mut Context<R>| &mut cx.mtt)?;

  let ctx = Context {
    mtt: wasi_mtt::Context::new(window),
    // wasi: WasiCtxBuilder::new().inherit_stdout().build(),
  };

  debug!("Setting up worker backing store...");
  let mut store = Store::new(&engine, ctx);
  store.epoch_deadline_async_yield_and_update(1);

  debug!("instantiating worker module...");

  let (client, _) = wasi_mtt::Client::instantiate_async(&mut store, &component, &linker).await?;

  debug!("Calling worker _start function...");
  client.start(&mut store).await?;

  Ok(())
}

#[tauri::command]
#[tracing::instrument(skip(wk_table))]
async fn terminate(wk_table: State<'_, WorkerTable>, id: &str) -> crate::Result<()> {
  debug!("Removing worker from wk_table...");
  let Worker { abort_handle } = {
    let mut wk_table = wk_table.0.lock().await;

    let process = wk_table.remove(id).ok_or(crate::Error::NotFound)?;

    drop(wk_table);

    process
  };

  debug!("Calling worker abort handle...");
  abort_handle.abort();

  Ok(())
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
  plugin::Builder::new("exts")
    .invoke_handler(tauri::generate_handler![
      install,
      uninstall,
      exists,
      metadata,
      clear,
      ids,
      instantiate,
      terminate,
    ])
    .setup(|app_handle| {
      let mut cfg = Config::new();
      cfg.async_support(true);
      cfg.epoch_interruption(true);

      let engine = Engine::new(&cfg)?;
      app_handle.manage(engine.clone());

      tauri::async_runtime::spawn(async move {
        loop {
          engine.increment_epoch();
          tokio::time::sleep(Duration::from_millis(100)).await;
        }
      });

      let wasm_dir = app_handle
        .path_resolver()
        .app_dir()
        .unwrap()
        .join("extensions");

      std::fs::create_dir_all(&wasm_dir)?;

      println!("wasm_dir {:?}", &wasm_dir);

      app_handle.manage(ExtTable::new(wasm_dir));

      app_handle.manage(WorkerTable::default());

      app_handle.manage(FsModuleLoader::new(PathBuf::new()));

      Ok(())
    })
    .build()
}
