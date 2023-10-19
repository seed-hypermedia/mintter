# CI

## TLDR;

- This repo is a Multi-Language repo.
- We use Nix & Bazel to manage project dependencies
- We use direnv to load all environment varialbes needed on the project
- For the frontend projects we use Yarn Workspaces.
- Currently we have 2 projects: Desktop app and Sites
- the Desktop app is built entirely on Github actions
- Sites are built as a Docker container for easy deployment 
- We create a new release of both projects every Tuesday in the morning automatically
- If we need to create a new release manually, we need to push a tag to the `main` branch and the process will start.
- version numbers follow the next pattern: `<YEAR>.<MONTH>.<NTH_COMMITS_ON_MONTH>`
- We run validation code (lint, format and test) on every push to `main` and on every PR















