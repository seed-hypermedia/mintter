# Mintter

This is the main repository for the Mintter project.

For more info see the [architecture diagram](/docs/architecture/README.md) (UPDATED 2022-01-07: it's quite out of date. A more recent document could be the [Mintter White Paper](https://www.notion.so/mintter/Mintter-Design-Document-bed174849106466cbec2a12dabddd701), although it also doesn't reflect the most up to date architecture, as everything is still in flux a bit.).

## Prerequisites

You MUST have [Nix](https://nixos.org/nix) package manager installed on your machine to work with this repository.

To setup Nix see [this](/docs/nix.md).

> For users on using the new apple silicon (m1) chip that run into weird errors (from nix and others) while setting up
> the repository. It may help to install rosetta 2 as not all tools have aarch64 support yet. You can install rosetta
> through the terminal by typing:.
>
> ```zsh
> softwareupdate --install-rosetta
> ```

## Build System

We've been changing the way we build the project quite a few times already. Initially we've been using
[redo](https://github.com/apenwarr/redo), then
[GN](https://chromium.googlesource.com/chromium/src/tools/gn/+/48062805e19b4697c5fbd926dc649c78b6aaa138/README.md), then
[Bazel](https://bazel.build), and now we're using [Please](https://please.build).

Yep, that's quite a lot of change, but right now it seems like the developer experience is quite good, and the project can be built in just a few simple commands, having the fewest number of tools preinstalled. Also @burdiyan is a build systems nerd. Reach out to @burdiyan for more info, or look around the `BUILD.plz` and the `build` directory.

See some [more info about the build system](/docs/build-system.md).

## Overview

Since we've wrote our
[Design Document](https://www.notion.so/mintter/Mintter-Design-Document-bed174849106466cbec2a12dabddd701) the project
structure has changed significantly.

At the moment you may find a mix of old and new code, so don't get too confused.

The basic architecture that still remains the same is that we two main component: Backend and Frontend.

Backend is running on user's machine, and Frontend is a web application that's using Backend APIs under the hood.

We're using Protobuf and GRPC for our API definitions. Look inside `proto` to see available APIs.

## Getting Started

Assuming you have the prerequisites:

1. Clone the repo.
2. Make sure Nix and direnv are installed (see above).
3. Run `./dev` and see the help information to see the list of available commands.

If Nix and direnv are properly installed, you should not need anything else. Report any issues you might have.

## Frontend Code Conventions

- files and folders are all `kebab-case`
- variables are `camelCase`
- components and editor plugins are `PascalCase`
- avoid creating abstractions
- avoid creating folders, better to have files as flat as possible
- avoid default exports, only default exports for page components (to use dynamic import).

## Frontend testing

```
yarn test
```
