## Mintter Protobuf Definitions

This is a unified place where our Protobuf definitions are stored.

Our gRPC API definitions follow in many aspects the recommendations stated in
the [API Improvement Proposals design documents](https://aip.dev).

## Code Generation

The generated code is committed to the repository, hence must be generated
beforehand. Ideally the workflow should be very simple and would require only to
run the `./dev gen` command. But this script has some weird issues at the
moment, so the safest thing to do is to regenerate all the protos with the
following command:

```
plz run sequential $(plz query filter -i 'generated:gen' //proto/...)
```

Check `git diff` after this, to make sure everything is how it should be.

When adding new Protobuf definitions, create a new `BUILD.plz` file taking some
existing one as an example (will probably be straight copy-paste).
