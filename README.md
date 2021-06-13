# Mintter

This is main repository for the Mintter project.

For more info about the architecture see [this](/docs/architecture/README.md).

## Prerequisites

You MUST have [Nix](https://nixos.org/nix) package manager installed on your
machine to work with this repository.

To setup Nix see [this](/docs/nix.md).

## Building System

This project's build system is pretty complex, but the final output is a single
static `mintterd` binary - that's the only you need to run.

We use [Ninja](https://ninja-build.org) build system with support of
[GN](http://gn.googlesource.com) templates to make the build easier to reason
about. It also helps us to run only the required things avoiding to do the work
if nothing has changed.

Most of the developer activities are wrapped into the `./dev` script in the root
of the repo. Run `./dev` with no argument to see the help information.

## Overview

The binary depends on a single-page NextJS application that's built and exported
separately and then included into the binary itself.

The NextJS app depends on some other packages with our editor plugins.

And everything depends on code generated from our Protobuf definitions.

Brief overview of the directory structure:

- `api` - contains all the Protobuf generated code for Go and JS.
- `backend` - backend Go code.
- `frontend/packages` - frontend TS and JS code which are separate packages.
- `frontend/www` - frontend TS and JS code for our NextJS SPA.
- `proto` - definitions in Protobuf shared between frontend and backend.
- `build` - tooling and configuration for the build system.
- `out` - build outputs are stored here in separate directories for each
  platform.

### Getting Started

Assuming you have the prerequisites:

1. Clone the repo.
2. Make sure Nix and Direnv are installed (see above).
3. Run `./dev run` to make a production build and run it locally.

During development it might be easier to run frontend and backend separately
though.

Run `./dev` with no argument to see available commands.

## Cross Compilation

We support cross compilation for Linux, Windows, and macOS at the moment. Run
`./dev build-cross` to cross-compile for all the platforms in parallel.

### gRPC

We are using [gRPC](https://grpc.io) for communication between frontend and
backend. Take a look inside `.proto` files in [proto](/proto) directory.

### Frontend vs. Backend

Frontend is the NextJS web app. For production, we'll use `next export` to
generate static assets and use it as an SPA. These static assets are going to be
served from the backend.

Backend is a long-running program that lives on user's local machine. It handles
all the p2p networking, IPFS and Lightning Network stuff. It exposes the gRPC
API for frontend to use.

### Frontend code conventions

- files and folders are all `kebab-case`
- variables are `camelCase`
- components and editor plugins are `PascalCase`
- avoid creating abstractions
- avoid creating folders, better to have files as flat as possible
- avoid default exports, only default exports for page components (to use
  dynamic import).
