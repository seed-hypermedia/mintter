# Proto Codegen

Content in this dir is mostly auto-generated. It is checked into Git for ease of
use. To recompile run `redo` or `redo proto/all` if running from the root of the
repository. You only need to recompile if you change `*.proto` files.

Currently we compile for Go and JavaScript (to be used in the browser with
[grpc-web](https://github.com/grpc/grpc-web)).

All the compiled files are currently in the same directory (we could rethink
that later), so turn off you "shit detector" for content of this directory :)

## JavaScript

The code is included as Yarn workspace, and can be imported as `@mintter/proto`.
Type declarations are also generated for ease of use with TypeScript.

## Go

Currenly there's no separate module for generated code, so it can be imported as
just another package of the parent module:

```go
import "mintter/proto"
```
