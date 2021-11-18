# Mintter Daemon GraphQL API Implementation

This package implement the GraphQL API exposed by the Mintter daemon.

Some of the code here is generated with [gqlgen](https://github.com/99designs/gqlgen).

See the [config](./gqlgen.yml) for more details.

The idea is to implement the resolver logic inside the `internal` package, and expose the final `http.Handler` from the root of this package,
taking the necessary dependencies for implementation inside the server constructor.

You can run the app and go to `http://localhost:55001/playground` in your browser to inspect the GraphQL Playground. 

To create a new wallet, execute
```graphql
mutation {
  setupLndHubWallet(input: {url: "lndhub://c02fa7989240c12194fc:7d06cfd829af4790116f@https://lndhub.io",
  name: "testWallet"}) {
    wallet{
      id
      name
      __typename
      balanceSats
    }
  }
}
```

And to retrieve the wallet info
```graphql
query {
  me {
    wallets {
      name
      balanceSats
    }
  }
}
```

