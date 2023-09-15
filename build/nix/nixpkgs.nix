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
  mintterOverlay = import ./overlay.nix;
in

{ 
  system ? builtins.currentSystem,
  nixpkgs ? pinnedNixpkgs,
  config ? {},
}:

import nixpkgs {
  overlays = [
    mintterOverlay
  ];
  inherit system;
  config = config;
}
