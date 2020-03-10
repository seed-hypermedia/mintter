# Mintter

This is main repository for the Mintter project.

![Deploy Frontend & Publish](https://github.com/mintterteam/mintter/workflows/Deploy%20Frontend%20&%20Publish/badge.svg?branch=master)

## Prerequisites

You need to have [Nix](https://nixos.org/nix) package manager installed on your
machine to work with this repository.

To setup Nix see [this](/docs/nix.md).

## Getting Started

Assuming you have the prerequisites:

1. Clone the repo.
2. Run `redo` to build everything.
3. Run `yarn dev` to run the frontend development server.
4. Run `go run ./backend/cmd/backend/` to run the backend.
5. Access the frontend URL from the browser.

### gRPC

We are using [gRPC](https://grpc.io) for communication between frontend and
backend. Take a look inside `.proto` files [here](/proto).

### Frontend vs. Backend

Frontend is the NextJS web app. For production, we'll use `next export` to
generate static assets and use it as an SPA. These static assets are going to be
served from the backend.

Backend is a long-running program that lives on user's local machine. It handles
all the p2p networking, IPFS and Lightning Network stuff. It exposes the gRPC
API for frontend to use.
