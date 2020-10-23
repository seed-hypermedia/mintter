# Mintter

This is main repository for the Mintter project.

![Deploy Frontend & Publish](https://github.com/mintterteam/mintter/workflows/Deploy%20Frontend%20&%20Publish/badge.svg?branch=master)

For more info about the architecture see [this](/docs/architecture/README.md).

## Prerequisites

You need to have [Nix](https://nixos.org/nix) package manager installed on your
machine to work with this repository.

To setup Nix see [this](/docs/nix.md).

## Building And Running

This project's build system is pretty complex, but the final output is a single
static `mintterd` binary - that's the only you need to run.

We are using the [redo](https://github.com/apenwarr/redo) build system to make
building everything faster and easier.

The binary depends on a single-page NextJS application that's built and exported
separately and then included into the binary itself.

The NextJS app depends on some other packages with our editor plugins.

And everything depends on code generated from our Protobuf definitions.

Brief overview of the directory structure:

- `api` - contains all the Protobuf generated code for Go and JS.
- `backend` - backend Go code.
- `frontend/packages` - frontend TS and JS code which are separate packages.
- `frontend/www` - frontend TS and JS code for our NextJS SPA.
- `proto` - Protobuf definitions shared between frontend and backend.
- `redoconf` - build files from the redoconf toolkit.
- `out` - build outputs are stored here in separate directories for each
  platform.

### Getting Started

Assuming you have the prerequisites:

1. Clone the repo.
2. Make sure Nix and Direnv are installed (see above).
3. Run `redo -j20` to build everything. Or `./scripts/run-build.sh` to build and
   run immediately.

During development it might be easier to run frontend and backend separately.

Use `./scripts/run-frontend.sh` to run frontend dev server, and
`./scripts/run-backend.sh` to start the backend. Open frontend dev server URL in
the browser instead of the one that will be opened by the backend, so that you
can see UI updates while coding.

## Cross Compilation

We support cross compilation for Linux, Windows, and macOS. Use
`./scripts/cross-compile.sh` to cross-compile for all the supported
architectures.

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
