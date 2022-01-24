# This file assembles a pinned version of nixpkgs with our custom overlay
# defined in overlay.nix. This file can be imported in place of normal <nixpkgs>.
{ 
  system ? builtins.currentSystem,
  # Nixpkgs as of 2021-10-16.
  nixpkgs ? (builtins.fetchTarball https://github.com/NixOS/nixpkgs/archive/ee084c02040e864eeeb4cf4f8538d92f7c675671.tar.gz),
  # Mozilla overlay commit as of 2022-01-24.
  moz_overlay ? import (builtins.fetchTarball https://github.com/mozilla/nixpkgs-mozilla/archive/7c1e8b1dd6ed0043fb4ee0b12b815256b0b9de6f.tar.gz),
  overlay ? import ./overlay.nix {},
  defaultOverlays ? [ 
    # The order matters here. We use rust from Mozilla overlay inside our own overlay.
    # It's a mess.
    moz_overlay
    overlay
  ],
  overlays ? [],
  config ? {},
}:

import nixpkgs {
  overlays = defaultOverlays ++ overlays;
  inherit system;
  config = {
    # Go 1.17 is not yet supported on x86_64-darwin, so we explicitly allow it here
    # only for this platform.
    allowUnsupportedSystem = if system == "x86_64-darwin" then true else false;
  } // config;
}
