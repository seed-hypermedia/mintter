# Mintter

Mintter is a decentralized knowledge collaboration application for open
communities powered by a knowledge graph.

You can read more about the product and why we are here on our website:
https://mintter.com

## ⚠️ Stability

This is alpha-quality software. Have a copy of anything valuable you put into
Mintter.

We expect to make a breaking (incompatible) change to the data model in
following weeks.

## Building

You can build the project on Linux, macOS, and Windows. Although using Windows
for active development is probably going to be painful (unless using WSL).

The setup for Linux, and macOS is simplified using the
[Nix Package Manager](https://nixos.org/nix), and [Direnv](https://direnv.net).
The setup on Linux is a bit more involved due to dependencies on system
libraries that don't work well on non-NixOS Linux distros.

The bare minimum required for compilation is to have Rust, Go, and NodeJS
toolchains installed.

See the [developer setup](./docs/dev-setup.md) page for more info on how to
build the project.
