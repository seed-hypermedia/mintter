# Mintter Desktop App

This is the desktop app wrapper of the Mintter App. To learn more about the
folder structure see https://tauri.app.

## Building

You should run `./dev run-desktop` or `./dev build-desktop` from the repos root
to run this app.

## Logging

The log level can be configured by setting the `RUST_LOG` environment variable:

```bash
RUST_LOG=debug ./dev run-desktop
```

The log level can also be configured **per-module**, so one choose to receive
trace logs from one module while completely ignoring other logs:

```bash
RUST_LOG=mintter::extensions=trace ./dev run-desktop
```

The module name can be easily found in the logs, since it’s always the third
item:

```
[2022-01-21][11:17:35][mio::poll][TRACE] registering event source with poller: token=Token(0), interests=READABLE | WRITABLE
[2022-01-21][11:17:35][tao::platform_impl::platform::app_delegate][TRACE] Triggered `applicationDidFinishLaunching`
[2022-01-21][11:17:35][tao::platform_impl::platform::app_state][TRACE] Activating visible window
[2022-01-21][11:17:35][tao::platform_impl::platform::app_state][TRACE] Activating visible window
[2022-01-21][11:17:35][tao::platform_impl::platform::app_state][TRACE] Activating visible window
[2022-01-21][11:17:35][tao::platform_impl::platform::app_delegate][TRACE] Completed `applicationDidFinishLaunching`
[2022-01-21][11:17:35][tao::platform_impl::platform::window_delegate][TRACE] Triggered `windowDidBecomeKey:`
[2022-01-21][11:17:35][tao::platform_impl::platform::window_delegate][TRACE] Completed `windowDidBecomeKey:`
[2022-01-21][11:17:35][mintter::daemon][INFO] 2022-01-21T11:17:35.755+0100      DEBUG   mintter/repo    backend/repo.go:176     AccountInitialized      {"accountID": "bahezrj4iaqaca3m3te23hdkj7gv37qy6c7s74vayreblkiowrwgsnhsxs5tkz5uw"}
[2022-01-21][11:17:35][mintter::daemon][INFO] 2022-01-21T11:17:35.829+0100      INFO    mintter/daemon  backend/main.go:118     DaemonStarted   {"grpcListener": "[::]:55002", "httpListener": "[::]:55001", "repoPath": "~/.mtt"}
[2022-01-21][11:17:36][tao::platform_impl::platform::window_delegate][TRACE] Triggered `windowDidResignKey:`
[2022-01-21][11:17:36][tao::platform_impl::platform::window_delegate][TRACE] Completed `windowDidResignKey:`
```

The logger can also be configured with more complex expressions:

```bash
RUST_LOG=trace,mintter::daemon=off ./dev run-desktop
```

```bash
RUST_LOG=mintter::daemon/foo ./dev run-desktop
```

## Documentation

`cargo doc --open` can be used to render a human-readable documentation of this
crate.
