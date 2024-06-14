# Seed Daemon GraphQL API Implementation

This package implement the GraphQL API exposed by the Seed daemon.

Some of the code here is generated with [gqlgen](https://github.com/99designs/gqlgen).

See the [config](./gqlgen.yml) for more details.

The idea is to implement the resolver logic inside the `internal` package, and expose the final `http.Handler` from the root of this package,
taking the necessary dependencies for implementation inside the server constructor.

You can run the app and go to `http://localhost:55001/playground` in your browser to inspect the GraphQL Playground.

To create a new wallet, execute

```graphql
mutation {
  setupLndHubWallet(
    input: {
      url: "lndhub://c02fa7989240c12194fc:7d06cfd829af4790116f@https://lndhub.io"
      name: "testWallet"
    }
  ) {
    wallet {
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
      id
    }
    lnaddress
  }
}
```

To Request invoice with query variables

```graphql
mutation RequestInvoice($input: RequestInvoiceInput!) {
  requestInvoice(input: $input) {
    paymentRequest
  }
}
```

Query variables:

```graphql
{ "input": {
  "accountID": "b3972ae93c1c386769ea6453c7c42cbf936401e439cba129fa8373594eff74ae",
  "amountSats": 0,
  "memo": "memo test"
}}
```

To pay an invoice

```graphql
mutation PayInvoice($input: PayInvoiceInput!) {
  payInvoice(input: $input) {
    walletID
  }
}
```

Query variables:

```graphql
{ "input": {
  "paymentRequest": "lnbc1500n1psm3c9qpp5xmhxxnh7jj9apr0ne7wkvc0rcnfxqql40a96cz62dxxqwng68l4qdpa2fjkzep6yp2x7upqxyczqmt0wd6zqatnv4n82mpqw35xjmn8wvs8gmeqv3hjqcqzpgxqr23ssp5353mj0hx08lhjzn7l9afkv88ham0dyr4d2h5nx6dmn9739ejaq2q9qyyssqenm9wk9vgwl6xr3kt23p4we0v9nkm3g8jrx6kz5vj2nfvkgmx4wr96nsakeex0y7glwpdxnxk3wzfvgc33yyhx5u32r4qekrs7uch4sqejfltp"
}}
```

To list payments

```graphql
query listInvoices($wID: ID!, $excExpired: Boolean, $excUnpaid: Boolean){
  payments(walletID: $wID, excludeExpired: $excExpired, excludeUnpaid: $excUnpaid) {
    sent{
      IsPaid
      ExpiresAt
      Amount
      Description
    }
    received {
      IsPaid
      ExpiresAt
      Amount
      Description
    }
  }
}
```
Query variables:

```graphql
{ "wID": "97186e34480d6aabcf59ebd37a893a0d02223f6a38822c8e6213c810384f0dc7",
  "excExpired": true,"excUnpaid": false}
```