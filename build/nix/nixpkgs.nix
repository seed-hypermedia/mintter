# This file assembles a pinned version of nixpkgs with our custom overlay
# defined in overlay.nix. This file can be imported in place of normal <nixpkgs>.
{ 
  system ? builtins.currentSystem,
  nixpkgs ? builtins.fetchGit {
    name = "nixpkgs-unstable";
    url = https://github.com/nixos/nixpkgs;
    # Commit hash for nixos-unstable as of 2021-09-22.
    # Run `git ls-remote https://github.com/nixos/nixpkgs refs/heads/nixpkgs-unstable`
    # to get the most recent revision.
    ref = "refs/heads/nixpkgs-unstable";
    rev = "ee084c02040e864eeeb4cf4f8538d92f7c675671";
  },
  overlay ? import ./overlay.nix,
  defaultOverlays ? [ overlay ],
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
