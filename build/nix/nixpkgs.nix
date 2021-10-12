import (builtins.fetchGit {
  # Descriptive name to make the store path easier to identify
  name = "nixpkgs-unstable";
  url = https://github.com/nixos/nixpkgs;
  # Commit hash for nixos-unstable as of 2021-09-22.
  # Run `git ls-remote https://github.com/nixos/nixpkgs refs/heads/nixpkgs-unstable`
  # to get the most recent revision.
  ref = "refs/heads/nixpkgs-unstable";
  rev = "ee084c02040e864eeeb4cf4f8538d92f7c675671";
}) {
  overlays = [
    (self: super: {
      go = super.go_1_17;
      nodejs = super.nodejs-16_x;
      bazel-wrapper = super.callPackage ./bazel-wrapper {};
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
      tauri-cli = super.callPackage ./tauri-cli {};
    })
  ];
}
