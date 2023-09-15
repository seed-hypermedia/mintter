# Frontend code patterns

This file aims to show all the frontend code patterns we (try!) to follow throughout all the application. This tries to cover the best practices that suits us based on the technology and tools we chose to use in the app.

> This is a Living document, so things are in constant change.

## Data Fetching

### Prefer a data-first approach

- because we are using `@tanstack/query`, there are situations in which we can have both `errors` and `data` at the same time, so [it is recommended](https://tkdodo.eu/blog/status-checks-in-react-query) in the [community resources](https://tanstack.com/query/v4/docs/react/community)