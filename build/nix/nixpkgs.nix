import (builtins.fetchGit {
  # Descriptive name to make the store path easier to identify
  name = "nixpkgs-unstable";
  url = https://github.com/nixos/nixpkgs;
  # Commit hash for nixos-unstable as of 2021-09-22.
  # Run `git ls-remote https://github.com/nixos/nixpkgs refs/heads/nixpkgs-unstable`
  # to get the most recent revision.
  ref = "refs/heads/nixpkgs-unstable";
  rev = "e0ce3c683ae677cf5aab597d645520cddd13392b";
}) {
  overlays = [
    (self: super: {
      go = super.go_1_17;
      nodejs = super.nodejs-16_x;
      impure-cc = super.callPackage ./impure-cc {};
      mkShell = super.mkShell.override {
        stdenv = super.stdenvNoCC;
      };
      buildGo117Module = super.buildGoModule.override {
        go = self.go;
      };
      please = super.callPackage ./please {
        buildGoModule = self.buildGo117Module;
      };
    })
  ];
}
