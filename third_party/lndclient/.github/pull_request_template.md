#### Pull Request Checklist

- [ ] PR is opened against correct version branch.
- [ ] Version compatibility matrix in the README and minimal required version
      in `lnd_services.go` are updated.
- [ ] Update `macaroon_recipes.go` if your PR adds a new method that is called
  differently than the RPC method it invokes.
