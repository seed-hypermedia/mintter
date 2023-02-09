/// This file contains the meat of the extension system such as installing, uninstalling, and instatiating extensions.
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
use tracing::{debug, info};
use wasmtime::{
  component::{Component, Linker},
  Config, Engine, Module, Store,
};

/// Installs an extension. This reads the bytes from a given `specifier` using a given `loader`,
/// currently that is loading from a given path on disk but it it set up to transparently support more protocols in the future, such as HTTP or IPFS.
///
/// The read bytes are parsed, validated and the written back out to the disk in the applications data dir.
/// The returned extension ID can be used in the `instatiate` function to instatiate the given extension.
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

/// Uninstalls an extension with the given ID. This will delete the wasm file from disk.
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

/// Wether or an extension with the given id is installed.
#[tauri::command]
#[tracing::instrument(skip(ext_table))]
fn exists(ext_table: State<'_, ExtTable>, id: &str) -> bool {
  ext_table.exists(id)
}

/// Returns the [`Metadata`] of the extension with the given ID.
/// This can be used to display information about the extension in a visual UI.
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

/// Uninstalls **all** extensions. Use with care!
#[tauri::command]
#[tracing::instrument(skip(ext_table))]
async fn clear(ext_table: State<'_, ExtTable>) -> crate::Result<()> {
  ext_table.clear().await?;

  Ok(())
}

/// Returns all installed extension IDs.
/// This can be used to display a list of all installed extensions, or to instantiate all installed extensions at once when the app starts.
#[tauri::command]
#[tracing::instrument(skip(ext_table))]
async fn ids(ext_table: State<'_, ExtTable>) -> crate::Result<Vec<String>> {
  let keys = ext_table.ids()?.collect();

  Ok(keys)
}

/// This type represents a running extension. It has an attached abort_handle that can be used by the UI to terminate the running extension.
#[derive(Debug)]
struct Worker {
  abort_handle: AbortHandle,
}

/// This table holds all running extensions in a thread safe type.
#[derive(Debug, Default)]
struct WorkerTable(Arc<Mutex<HashMap<String, Worker>>>);

/// Instantiates an **installed extension** with the given ID.
///
/// ## Implementation details
///
/// Each running extension is modelled as a tokio task (essentially a lightweight green thread).
/// Due to the design of Rusts async mechanism this means extensions that wait on something (events, io, etc.)
/// are just tasks that are put into tokios parking lot of blocked tasks until the future they are waiting on resolves.
/// To help with fairness each running extension has a maximum 25 millisecond time slice of execution until it get's forcibly interrupted.
/// This means even long running extensions can't steal processing time from others and importantly can't make the UI too unresponsive.
///
/// Running extensions (each extension being a Rust [`Future`]) are wrapped in the `Abortable` future type, which gives us an `AbortHandle` that we can use to forcibly terminate an extension later.
/// This will immediately halt the execution of that extension, so doesn't allow the running extension to perform any cleanup.
///
/// Instantiating an extension has the following steps:
/// 1. Read the extension bytes from the app data directory (the ext_table).
/// 2. Parse the bytes into a Wasm Component.
/// 3. Set up a [`wasmtime::Linker`] and add all our `wasi-mtt` functions to it.
///   This will make them available to the wasm module later.
/// 4. Set up a backing store for the extension. This owns all the bytes that belong to a running Wasm module.
/// 5. Instantiate the wasm module
/// 6. Call the wasm modules `start` function and await it's execution.
#[tauri::command]
#[tracing::instrument(skip(engine, ext_table, wk_table, window))]
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

// This function is the inner implementation of the `instatiate` function and is
// separate just so the abort handle construction doesn't become bloated and unreadable.
#[inline]
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
  wasi_mtt::add_to_linker(&mut linker, |cx: &mut Context<R>| &mut cx.mtt)?;

  debug!("Setting up worker backing store...");
  let mut store = Store::new(&engine, wasi_mtt::Context::new(window));
  store.epoch_deadline_async_yield_and_update(1);

  debug!("instantiating worker module...");

  let (client, _) = wasi_mtt::Client::instantiate_async(&mut store, &component, &linker).await?;

  debug!("Calling worker _start function...");
  client.client().start(&mut store).await?;

  Ok(())
}

/// This function calls the workers `AbortHandle` immediately halting the extensions execution.s
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
      // Set up the app-wide wasmtime configuration, such as the compilation engine and time slicing.

      let mut cfg = Config::new();
      cfg.async_support(true);
      cfg.epoch_interruption(true);

      let engine = Engine::new(&cfg)?;
      app_handle.manage(engine.clone());

      tauri::async_runtime::spawn(async move {
        loop {
          engine.increment_epoch();
          tokio::time::sleep(Duration::from_millis(25)).await;
        }
      });

      let wasm_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .unwrap()
        .join("extensions");

      std::fs::create_dir_all(&wasm_dir)?;

      info!("wasm_dir {:?}", &wasm_dir);

      app_handle.manage(ExtTable::new(wasm_dir));
      app_handle.manage(WorkerTable::default());
      app_handle.manage(FsModuleLoader::new(PathBuf::new()));

      Ok(())
    })
    .build()
}
