# This file assembles a pinned version of nixpkgs with our custom overlay
# defined in overlay.nix. This file can be imported in place of normal <nixpkgs>.
let
  pkgs = import <nixpkgs> {};
  # Nixpkgs as of 2022-05-23.
  # Update sha256 with `nix-prefetch fetchFromGitHub --owner NixOS --repo nixpkgs --rev <commit>`.
  pinnedNixpkgs = pkgs.fetchFromGitHub {
    owner = "NixOS";
    repo = "nixpkgs";
    rev = "f4dfed73ee886b115a99e5b85fdfbeb683290d83";
    sha256 = "sha256-5uUrHeHBIaySBTrRExcCoW8fBBYVSDjDYDU5A6iOl+k=";
  };
  # Rust overlay as of 2022-01-24.
  # Update sha256 with `nix-prefetch fetchFromGitHub --owner oxalica --repo rust-overlay --rev <commit>`.
  rustOverlay = import (pkgs.fetchFromGitHub {
    owner = "oxalica";
    repo = "rust-overlay";
    rev = "4e093ce661a63aca4bcbace33695225eae4ef4e4";
    sha256 = "sha256-YsWu3C9IGbH3+xguTzEDyQorFe/igr6FGZ+Q5T2ocxE=";
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
