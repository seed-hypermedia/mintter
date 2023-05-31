# This file assembles a pinned version of nixpkgs with our custom overlay
# defined in overlay.nix. This file can be imported in place of normal <nixpkgs>.
let
  pkgs = import <nixpkgs> {};
  # Nixpkgs as of 2023-05-25.
  # Update sha256 with `nix-prefetch fetchFromGitHub --owner NixOS --repo nixpkgs --rev <commit>`.
  pinnedNixpkgs = pkgs.fetchFromGitHub {
    owner = "NixOS";
    repo = "nixpkgs";
    rev = "21eb6c6ba74dcbe3ea5926ee46287300fb066630";
    sha256 = "sha256-ZLnSr35L6C49pCZS9fZCCqkIKNAeQzykov2QfosNG9w=";
  };
  # Rust overlay as of 2023-05-31.
  # Update sha256 with `nix-prefetch fetchFromGitHub --owner oxalica --repo rust-overlay --rev <commit>`.
  rustOverlay = import (pkgs.fetchFromGitHub {
    owner = "oxalica";
    repo = "rust-overlay";
    rev = "9651f0beee6e7a9783cc02eac722854851c65ae7";
    sha256 = "sha256-P6wLC+P8o9w4XNLZAbZy3BwKkp1xi/+H9dF+7SXDP70=";
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
