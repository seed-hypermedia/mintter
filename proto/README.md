## Seed Protobuf Definitions

This is a unified place where our Protobuf definitions are stored.

Our gRPC API definitions follow in many ways the recommendations stated in
the [API Improvement Proposals design documents](https://aip.dev).

## Code Generation

The generated code is committed to the repository, hence must be generated
beforehand.

If you modify the existing proto files, run `./dev gen` after you're done,
and check that generated code is what you expect.

If you create a new protobuf definition, copy `BUILD.plz` from an existing one,
adapt if needed, and then run `./dev gen` to generate code.

Sometimes `./dev gen` command can silently fail (let @burdiyan know if this happens),
so to forcefully generate all the code run `plz run sequential $(plz query filter -i 'generated:gen' //proto/...)`
