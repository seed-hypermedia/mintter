## Logging

### From Javascript

The package `tauri-plugin-log-api` mirrors the functions on the traditional `console` object. They can be used to write logs to the unified logging facilities.

```jsx
import { trace, debug, info, warn, error } from 'tauri-plugin-log-api'

trace("foo")
debug("bar")
info("baz")
warn("fiz")
error("buz")
```

### From Rust

To write logs to the unified logging facilities from rust code, just use the standard macros provided by the `log` crate;

```rust
use log::{trace, debug, info, warn, error};

trace!("foo");
debug!("bar");
info!("baz");
warn!("fiz");
error!("buz");
```

### (From Go)

Right now all logs produced by the daemon will be written to the unified logs as `info` logs, because there is no way to determine the level rn (we need to fix this).