# Golang client library for lnd

`lndclient` is a golang native wrapper for `lnd`'s gRPC interface.

## Compatibility matrix

This library depends heavily on `lnd` for obvious reasons. To support backward
compatibility with older versions of `lnd`, we use different branches for
different versions. There are two "levels" of depending on a version of
`lnd`:
 - Code level dependency: This is the version of `lnd` that is pulled in when
   compiling `lndclient`. It is defined in `go.mod`. This usually is the latest
   released version of `lnd`, because its RPC definitions are kept backward
   compatible. This means that a new field added in the latest version of `lnd`
   might already be available in `lndclient`'s code, but whether or not that
   field will actually be set at run time is dependent on the actual version of
   `lnd` that's being connected to.
 - RPC level dependency: This is defined in `minimalCompatibleVersion` in
   [`lnd_services.go`](lnd_services.go). When connecting to `lnd`, the version
   returned by its version service is checked and if it doesn't meet the minimal
   required version defined in `lnd_services.go`, an error will be returned.
   Users of `lndclient` can also overwrite this minimum required version when
   creating a new client.

The current compatibility matrix reads as follows:

| `lndclient` git tag          | `lnd` version in `go.mod` | minimum required `lnd` version | 
| ---------------------------- | ------------------------- | ------------------------------ |
| [`v0.13.0-6`](https://github.com/lightninglabs/lndclient/blob/v0.13.0-6) | `lnd @ 44971f0` | `v0.13.0-beta` |
| [`v0.12.0-7`](https://github.com/lightninglabs/lndclient/blob/v0.12.0-7) | `v0.12.0-beta` | `v0.12.0-beta` |
| `master` / [`v0.11.1-5`](https://github.com/lightninglabs/lndclient/blob/v0.11.1-5) | `v0.11.1-beta` | `v0.11.1-beta` | 


By default, `lndclient` requires (and enforces) the following RPC subservers to
be active in `lnd`:
 - `signrpc`
 - `walletrpc`
 - `chainrpc`
 - `invoicesrpc`

## Branch strategy

We follow the following strategy to maintain different versions of this library
that have different `lnd` compatibilities:

1. The `master` is always backward compatible with the last major version.
2. We create branches for all minor versions and future major versions and merge PRs to those branches, if the features require that version to work.
3. We rebase the branches if needed and use tags to track versions that we depend on in other projects.
4. Once a new major version of `lnd` is final, all branches of minor versions lower than that are merged into master.
