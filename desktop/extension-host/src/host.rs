use crate::{Error, Extension, Hook, ModuleLoader, NoopModuleLoader};
use futures_util::TryFutureExt;
use serde::{de::DeserializeOwned, Serialize};
use std::{collections::BTreeMap, fmt::Debug, ops::RangeBounds, str::FromStr, sync::Arc};
use tracing::{debug, info, instrument};
use wasmtime::{Config as WasmtimeConfig, Engine};

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct HookKey {
  hook: Hook,
  extension: usize,
}

impl HookKey {
  pub fn hook_range(hook: Hook) -> impl RangeBounds<HookKey> {
    let lower = HookKey { hook, extension: 0 };
    let upper = HookKey {
      hook,
      extension: usize::MAX,
    };

    lower..=upper
  }
}

pub struct Host<L: ModuleLoader = NoopModuleLoader> {
  engine: Engine,
  module_loader: L,
  map: BTreeMap<HookKey, Arc<Extension>>,
  extensions: Vec<Arc<Extension>>,
}

impl Default for Host {
  fn default() -> Self {
    Self::new(NoopModuleLoader)
  }
}

impl<L: ModuleLoader> Debug for Host<L> {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    f.debug_struct("Host")
      .field("module_loader", &self.module_loader)
      .field("extensions", &self.extensions)
      .finish()
  }
}

impl<L: ModuleLoader> Host<L> {
  pub fn new(module_loader: L) -> Self {
    let mut cfg = WasmtimeConfig::default();
    cfg.async_support(true);

    Self {
      engine: Engine::new(&cfg).expect("Failed to create wasmtime egine"),
      module_loader,
      map: Default::default(),
      extensions: Default::default(),
    }
  }

  #[instrument(level = "trace")]
  pub async fn load_extension(&mut self, specifier: &str) -> Result<(), Error> {
    let bytes = self.module_loader.load(specifier).await?;

    let id = self.extensions.len();
    let ext = Arc::new(Extension::new(self, &bytes, id)?);

    self.extensions.push(ext.clone());

    for export in ext.exports() {
      if let Ok(hook) = Hook::from_str(export) {
        let key = HookKey {
          hook,
          extension: id,
        };

        self.map.insert(key, ext.clone());
      }
    }

    info!(extension = ?specifier, extension_id = ?id, "Succesfully loaded extension");
    Ok(())
  }

  pub fn engine(&self) -> &Engine {
    &self.engine
  }

  pub fn module_loader(&self) -> &L {
    &self.module_loader
  }

  #[inline]
  #[instrument(level = "trace")]
  pub(crate) async fn hook_first<P, R>(&self, hook: Hook, params: &P) -> Result<R, Error>
  where
    P: Serialize + Debug,
    R: DeserializeOwned + Debug,
  {
    let payload = serde_json::to_vec(params)?;
    let exts = self.map.range(HookKey::hook_range(hook));

    let futs = exts.map(|(_, ext)| {
      let fut = ext
        .call(hook, payload.clone())
        .and_then(|out| async move { serde_json::from_slice::<R>(&out).map_err(Into::into) });

      Box::pin(fut)
    });

    let (result, _) = futures_util::future::select_ok(futs).await?;

    debug!(target = "hook_first", hook = ?hook, plugin_result = ?result, "Plugin result");

    Ok(result)
  }

  #[inline]
  #[instrument(level = "trace", skip(f))]
  pub(crate) async fn hook_fold<P, R, F>(&self, hook: Hook, params: &P, f: F) -> Result<R, Error>
  where
    P: Serialize + Debug,
    R: DeserializeOwned,
    F: Fn(R) -> P,
  {
    let mut payload = serde_json::to_vec(params)?;
    let exts = self.map.range(HookKey::hook_range(hook));

    for (_, ext) in exts {
      let out = ext.call(hook, payload.clone()).await?;
      payload = serde_json::to_vec(&f(serde_json::from_slice(&out)?))?;
      debug!(target = "hook_fold", hook = ?hook, plugin_result = ?payload, "Plugin result")
    }

    serde_json::from_slice(&payload).map_err(Into::into)
  }

  #[inline]
  #[instrument(level = "trace")]
  pub(crate) async fn hook_parallel<P, R>(&self, hook: Hook, params: &P) -> Result<Vec<R>, Error>
  where
    P: Serialize + Debug,
    R: DeserializeOwned + Debug,
  {
    let payload = serde_json::to_vec(params)?;
    let exts = self.map.range(HookKey::hook_range(hook));

    let futs = exts.map(|(_, ext)| {
      let fut = ext
        .call(hook, payload.clone())
        .and_then(|out| async move { serde_json::from_slice::<R>(&out).map_err(Into::into) });

      Box::pin(fut)
    });

    let out = futures_util::future::join_all(futs)
      .await
      .into_iter()
      .inspect(
        |el| debug!(target = "hook_parallel", hook = ?hook, plugin_result = ?el, "Plugin result"),
      )
      .filter_map(Result::ok)
      .collect();

    Ok(out)
  }
}
