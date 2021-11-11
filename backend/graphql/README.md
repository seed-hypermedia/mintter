# Mintter Daemon GraphQL API Implementation

This package implement the GraphQL API exposed by the Mintter daemon.

Some of the code here is generated with [gqlgen](https://github.com/99designs/gqlgen).

See the [config](./gqlgen.yml) for more details.

The idea is to implement the resolver logic inside the `internal` package, and expose the final `http.Handler` from the root of this package,
taking the necessary dependencies for implementation inside the server constructor.
