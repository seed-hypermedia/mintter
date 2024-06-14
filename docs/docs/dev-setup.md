# Developer Setup

> Checkout the [Build System Document](./build-system.md)

## Building on Unix-Like Systems

The setup is simplified by using the [Nix Package Manager](https://nixos.org/nix), and [Direnv](https://direnv.net). You should use this setup on Unix-like systems, instead of trying to manually install the required tools.

### Prerequisites

You must have the C toolchain installed globally on your machine. It can be `gcc` or `clang` with their corresponding linkers.

### Install Nix

> checkout the [Nix](./nix.md) documentation for more context

Nix is a package manger for Unix-like systems, which is very strict about isolating packages. It will not mess around with your existing system packages. Ideally Nix would be the only piece of software needed to build Seed, but unfortunately some OpenGL packages, and some system libraries don't work quite well. We still leverage Nix to manage other tools and runtimes required to work with Seed.

So, install Nix by following the [official documentation](https://nixos.org/download.html) for your system.

_NOTE: for macOS it may be necessary to create a virtual APFS volume, because Nix expects having access to `/nix` directory, but macOS in recent versions doesn't allow creating directories in the root catalog. The installer should guide you through the process. For Apple Silicon machines, it may be needed to install Rosetta._

Follow the installation instructions precisely. To successfully complete the setup, you should write some information in your shell profile in order for Nix to work. It may be that the installer is able to do this setup for you, though.

To verify the installation open an empty terminal window and run:

```
nix-env -i hello
hello
```

This should run the GNU Hello program installed with Nix.

### Install Direnv

[Direnv](https://direnv.net) is used to configure the development environment when you open up the project directory. It's useful because it makes configuration portable between developers, and won't pollute your global environment.

You can install Direnv with Nix:

```
nix-env -i direnv
```

IMPORTANT: To complete the setup you must add direnv shell hooks to your shell profile:

```shell
eval "$(direnv hook bash)"  # for bash
eval "$(direnv hook zsh)"   # for zsh
eval (direnv hook fish)     # for fish
```

Make sure to add the direnv hook _after_ Nix configuration in the shell profile.

It's _highly_ recommended to configure your IDE to work with direnv. We have setup the corresponding extension recommendations for VS Code.

### Install System Libraries (non-nixOS Linux Only)

The setup for Linux is a bit more involved because some OpenGL libraries don't work well with Nix on non-nixOS distros.

So to compile on Linux you must have the following libraries installed:

- libgtk-3-dev
- libwebkit2gtk-4.0-dev
- libayatana-appindicator3-dev
- librsvg2-dev
- patchelf

Eventually we might be able to setup all of this be configured with Nix.

## Building on Windows

Internally, none of us uses Windows for development, but we _do_ build _for_ Windows _on_ Windows machines in CI. You can inspect the corresponding GitHub Actions workflow definitions to find out what needs to be installed to compile the project.

## Running App

To run the app, by default it will run on the test network:

```
./dev run-desktop
```

You can also run against the production network:

```
SEED_P2P_TESTNET_NAME="" ./dev run-desktop
```

## Web App Builds

You can build docker images for different modules of the system.

Daemon: `docker build -t seed-daemon . -f ./backend/cmd/seed/Dockerfile`
Frontend: `docker build -t gateway . -f ./frontend/gateway/Dockerfile`

## Dev: Run Site

#### 1. Run the Daemon

You can start the daemon go daemon with:

```
go run ./backend/cmd/seed-site -data-dir=~/.mttsite -p2p.port=59000 --http.port=59001 -p2p.no-relay -grpc.port=59002 http://127.0.0.1:59001
```


### 2. Start the Frontend Web App

In the Seed directory, start by running `yarn`. Then:

```
HM_BASE_URL="http://localhost:3000" GRPC_HOST="http://localhost:59001" PORT=3000 yarn site
```

## Dev: Run Gateway

Run the daemon:

```
SEED_P2P_TESTNET_NAME="dev" go run ./backend/cmd/seed-site -data-dir=~/.mttgateway -p2p.port=57000  -grpc.port=57002 -http.port=57001 -p2p.no-relay -syncing.allow-push -syncing.no-discovery=false "http://localhost:3300"
```

Simultaneously run the Frontend:

```
NEXT_PUBLIC_ENABLE_GATEWAY=true NEXT_PUBLIC_GRPC_HOST="http://localhost:57001/" GRPC_HOST="http://localhost:57001/" PORT=3300 GW_NEXT_HOST="http://localhost:3300" yarn site
```

Now your dev gateway is running at `http://localhost:3300`

## Debugging JSON-CBOR Blobs

Use this URL:

```
localhost:{your-http-port-or-default-55002/debug/cid/{your-cid}
```