# This file assembles a pinned version of nixpkgs with our custom overlay
# defined in overlay.nix. This file can be imported in place of normal <nixpkgs>.
{ 
  system ? builtins.currentSystem,
  sources ? import ./sources.nix,
  nixpkgs ? sources.nixpkgs,
  moz_overlay ? import sources.nixpkgs-mozilla,
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
