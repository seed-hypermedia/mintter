# This file assembles a pinned version of nixpkgs with our custom overlay
# defined in overlay.nix. This file can be imported in place of normal <nixpkgs>.
let
  pkgs = import <nixpkgs> {};
  # Nixpkgs as of 2022-01-24.
  # Update sha256 with `nix-prefetch --owner NixOS --repo nixpkgs --rev <commit>`.
  pinnedNixpkgs = pkgs.fetchFromGitHub {
    owner = "NixOS";
    repo = "nixpkgs";
    rev = "cc68710784ffe0ee035ee7b726656c44566cac94";
    sha256 = "0j1hngbqf4h9pm4pkkrw6fxrifwjj5vbq52gf4i9hwc2z2wxn6pj";
  };
  # Rust overlay as of 2022-01-24.
  # Update sha256 with `nix-prefetch --owner oxalica --repo rust-overlay --rev <commit>`.
  rustOverlay = import (pkgs.fetchFromGitHub {
    owner = "oxalica";
    repo = "rust-overlay";
    rev = "9fb49daf1bbe1d91e6c837706c481f9ebb3d8097";
    sha256 = "1h8v9346kw70glmsg58dz3fa260iy38p9kdf73nxphnnf6dy2yd4";
  });
  mintterOverlay = import ./overlay.nix;
in

{ 
  system ? builtins.currentSystem,
  nixpkgs ? pinnedNixpkgs,
  config ? {},
}:

import nixpkgs {
  overlays = [
    # Order matters here. We use rust overlay inside our custom overlay.
    rustOverlay
    mintterOverlay
  ];
  inherit system;
  config = config;
}
