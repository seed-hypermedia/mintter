# Proto Codegen

Content in this dir is mostly auto-generated. It is checked into Git for ease of
use. To recompile run `redo` or `redo proto/all` if running from the root of the
repository. You only need to recompile if you change .proto files.

Currently we compile for Go and JavaScript (to be used in the browser with
[grpc-web](https://github.com/grpc/grpc-web)).

All the compiled files are currently in the same directory (we could rethink
that later), so turn-off you "shit detector" for content of this directory :)

## JavaScript

The code is included as Yarn workspace, and can be imported as `@mintter/proto`.
Type declarations are also generated for easy of use with TypeScript.

Example:

```js
import {AccountsPromiseClient} from '@mintter/proto/mintter_grpc_web_pb’
import {GenSeedRequest} from '@mintter/proto/mintter_pb'

const c = new AccountsPromiseClient(
      `${window.location.protocol}//${window.location.host}`,
    )

    const req = new GenSeedRequest()
    req.setAezeedPassphrase(‘hello’)

    c.genSeed(req)
      .then(data => console.log(data.getMnemonicList()))
      .catch(err => console.error(err))

```

## Go

Currenly there's not separate module for generated code, so it can be imported
as just another package of the parent module:

```go
import "mintter/proto"
```
