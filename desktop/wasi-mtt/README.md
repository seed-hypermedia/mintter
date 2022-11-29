# wasi-mtt

This is the set of APIs that are exposed to the WASM module running inside the wasmtime plugin runtime.

## APIs

Each API is defined in a [`*.wit`](https://github.com/WebAssembly/component-model/blob/main/design/mvp/WIT.md) IDL file in the [`wit`](./wit) folder. These files are used to generate the Host-side (which is implemented in this crate) and potentially client integrations using the [`wit-bindgen`](https://github.com/bytecodealliance/wit-bindgen) tool.

## Documentation

Each `*.wit` IDL file contains inline doc comments explaining the overall purpose of each interface as well as each function. You can use the `wit-bindgen` tool to turn these declarations into nicer to look at markdown files.