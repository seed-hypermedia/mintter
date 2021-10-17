# Mintter

This is main repository for the Mintter project.

For more info about the architecture see [this](/docs/architecture/README.md).

## Prerequisites

You MUST have [Nix](https://nixos.org/nix) package manager installed on your machine to work with this repository.

To setup Nix see [this](/docs/nix.md).

> For users on using the new apple silicon (m1) chip that run into weird errors (from nix and others) while setting up
> the repository. It may help to install rosetta 2 as not all tools have aarch64 support yet. You can install rosetta
> through the terminal by typing:
>
> ```zsh
> softwareupdate --install-rosetta
> ```

## Build System

We've been changing the way we build the project quite a few times already. Initially we've been using
[redo](https://github.com/apenwarr/redo), then
[GN](https://chromium.googlesource.com/chromium/src/tools/gn/+/48062805e19b4697c5fbd926dc649c78b6aaa138/README.md) and
Ninja, and now we're using [Bazel](https://bazel.build).

But don't be confused, we're not using Bazel in a conventional way.

Reach out to @burdiyan for more info, or look around the `BUILD.bazel` files and our custom rules yourself.

## Overview

Since we've wrote our
[Design Document](https://www.notion.so/mintter/Mintter-Design-Document-bed174849106466cbec2a12dabddd701) the project
structure has changed significantly.

At the moment you may find a mix of old and new code, so don't get too confused.

The basic architecture that still remains the same is that we two main component: Backend and Frontend.

Backend is running on user's machine, and Frontend is a web application that's using Backend APIs under the hood.

We're using Protobuf and GRPC for our API definitions. Look inside `proto` to see available APIs.

### Getting Started

Assuming you have the prerequisites:

1. Clone the repo.
2. Make sure Nix and Direnv are installed (see above).
3. Run `./dev run` to make a production build and run it locally.

During development it might be easier to run frontend and backend separately though.

Run `./dev` with no argument to see available commands.

## Cross Compilation

We support cross compilation for Linux, Windows, and macOS at the moment. Run `./dev build-cross` to cross-compile for
all the platforms in parallel.

### Frontend Code Conventions

- files and folders are all `kebab-case`
- variables are `camelCase`
- components and editor plugins are `PascalCase`
- avoid creating abstractions
- avoid creating folders, better to have files as flat as possible
- avoid default exports, only default exports for page components (to use dynamic import)

### VSCode Integration

To support features like go-to-definition a plugin like ZipFS is needed.

Run the following command, which will generate a new directory called .yarn/sdks:

```bash
yarn dlx @yarnpkg/sdks vscode
```

For safety reason VSCode requires you to explicitly activate the custom TS settings:

1. Press `ctrl+shift+p` in a TypeScript file
2. Choose "Select TypeScript Version"
3. Pick "Use Workspace Version"

For more and updated information about this setup, please visit [this link](https://yarnpkg.com/getting-started/editor-sdks#vscode)
