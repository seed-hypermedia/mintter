pub mod fetch;
pub mod log;
pub mod pledge;
pub mod poll;

wit_bindgen_host_wasmtime_rust::generate!({
    tracing: true,
    async: true,
    export: "./wit/client.wit",
    name: "client",
});
