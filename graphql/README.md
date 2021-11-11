# Mintter Daemon GraphQL API

This is the schema of the GraphQL API exposed by the Mintter Daemon.

It contains some Go-specific directives, and eventually we might want to split the schema into different files, so it's easier to work with.

Eventually we'd probably want to do some transformation to strip away some directives, or even generate some types on the fly and what not,
which could make the final schema easier to consume by clients, generate documentation, etc.

## Play Around

On the configured HTTP port the Daemon exposes two routes:

1. `/playground` - the GraphQL Playground UI. Useful to test the API in the browser.
2. `/graphql` - the actual API endpoint for GraphQL.
