use crate::{Error, Hook, Host, ModuleLoader};
use cached::proc_macro::cached;
use semver::Version;
use serde::Deserialize;
use std::{fmt::Debug, sync::Arc};
use tracing::{instrument, debug};
use wasi_common::{
    pipe::{ReadPipe, WritePipe},
    WasiCtx,
};
use wasmtime::{Engine, InstancePre, Linker, Module, Store, TypedFunc};
use wasmtime_wasi::WasiCtxBuilder;

#[derive(Debug, Deserialize, PartialEq, Eq)]
struct ExtensionMetadata {
    title: String,
    description: String,
    version: Version,
}

#[derive(Clone)]
pub struct Extension {
    id: usize,
    exports: Vec<String>,
    engine: Engine,
    instance_pre: Arc<InstancePre<WasiCtx>>,
}

impl Debug for Extension {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Extension")
            .field("id", &self.id)
            .field("exports", &self.exports)
            .finish()
    }
}

impl Extension {
    // TODO: verify extension exports/imports and permissions here
    pub fn new<L: ModuleLoader>(host: &Host<L>, bytes: &[u8], id: usize) -> Result<Self, Error> {
        debug!(target = "new", "Parsing wasm module from bytes");
        let module = Module::new_with_name(host.engine(), bytes, &id.to_string())?;

        debug!(target = "new", "Collecting information about exported funcs");
        let exports = module
            .exports()
            .filter_map(|exp| {
                if exp.ty().func().is_some() {
                    Some(exp.name().to_string())
                } else {
                    None
                }
            })
            .collect();

        debug!(target = "new", "Setting up linking context");
        let mut linker = Linker::new(host.engine());
        wasmtime_wasi::add_to_linker(&mut linker, |cx| cx)?;

        debug!(target = "new", "Pre-instatiating wasm module");
        let tmp_ctx = WasiCtxBuilder::new().build();
        let mut tmp_store = Store::new(host.engine(), tmp_ctx);
        let instance_pre = Arc::new(linker.instantiate_pre(&mut tmp_store, &module)?);

        Ok(Self {
            id,
            exports,
            instance_pre,
            engine: host.engine().clone(),
        })
    }

    pub fn id(&self) -> usize {
        self.id
    }

    pub fn exports(&self) -> &Vec<String> {
        &self.exports
    }

    pub async fn title(&self) -> Result<String, Error> {
        self.metadata().await.map(|meta| meta.title)
    }

    pub async fn description(&self) -> Result<String, Error> {
        self.metadata().await.map(|meta| meta.description)
    }

    pub async fn version(&self) -> Result<Version, Error> {
        self.metadata().await.map(|meta| meta.version)
    }

    async fn metadata(&self) -> Result<ExtensionMetadata, Error> {
        let out = self.call(Hook::Metadata, Vec::new()).await?;
        serde_json::from_slice(&out).map_err(Into::into)
    }

    #[instrument(level = "trace")]
    pub(crate) async fn call(&self, hook: Hook, payload: Vec<u8>) -> Result<Vec<u8>, Error> {
        call_hook(self.clone(), hook, payload).await
    }
}

impl core::hash::Hash for Extension {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}

impl PartialEq for Extension {
    fn eq(&self, other: &Self) -> bool {
        self.exports == other.exports && self.id == other.id
    }
}

impl Eq for Extension {}

#[instrument(level = "trace")]
#[cached(result = true)]
async fn call_hook(ext: Extension, hook: Hook, payload: Vec<u8>) -> Result<Vec<u8>, Error> {
    // setup the wasm context. for now this is just the wasi context, but will expanded with mintter specific ones
    debug!(target = "call_hook", "Setting up wasm module context");
    let mut wasi_ctx = WasiCtxBuilder::new().inherit_stderr().build();

    debug!(target = "call_hook", "Setting hook input (virtual stdin)");
    let stdin = ReadPipe::from(payload);
    wasi_ctx.set_stdin(Box::new(stdin));

    debug!(target = "call_hook", "Setting hook output (virtual stdout)");
    let stdout = WritePipe::new_in_memory();
    wasi_ctx.set_stdout(Box::new(stdout.clone()));

    let mut store = Store::new(&ext.engine, wasi_ctx);
    let instance = ext.instance_pre.instantiate_async(&mut store).await?;

    debug!(target = "call_hook", "Initialize wasm module state (`_start` func)");
    let start: TypedFunc<(), ()> = instance.get_typed_func(&mut store, "_start")?;
    start
        .call_async(&mut store, ())
        .await
        .map_err(Error::HookInitialization)?;

    debug!(target = "call_hook", func = ?hook.to_string(), "Calling wasm module export", );
    let hook: TypedFunc<(), ()> = instance.get_typed_func(&mut store, &hook.to_string())?;
    hook.call_async(&mut store, ())
        .await
        .map_err(Error::HookExecution)?;

    drop(store);

    Ok(stdout
        .try_into_inner()
        .expect("sole remaining reference to WritePipe")
        .into_inner())
}
