{ 
  pkgs,
  fetchFromGitHub,
  rustPlatform,
  openssl,
  darwin,
  lib,
  hostPlatform,
  extraNativeBuildInputs ? []
}:

let
  # == How To Update ==
  # 1. Run `nix-prefetch fetchFromGitHub --owner tauri-apps --repo tauri --rev <COMMIT>`. This will print the sha256.
  # 2. Change the values of `rev` and `sha256` in this file accordingly.
  src = fetchFromGitHub {
    owner = "tauri-apps";
    repo = "tauri";
    rev = "4036e15f5af933bdc0d0913508b5103958afc143";
    sha256 = "sha256-HhHoajzQ67RtXXvWcFOl3mbpSZh73oA9x8wKuIY6+XI=";
  };
in
  rustPlatform.buildRustPackage {
    pname = "tauri-cli";
    version = src.rev;
    src = src;
    sourceRoot = "source/tooling/cli";
    cargoLock = {
      lockFile = "${src}/tooling/cli/Cargo.lock";
    };
    buildInputs = [
      (lib.optionals hostPlatform.isMacOS [
        darwin.apple_sdk.frameworks.Security
        darwin.apple_sdk.frameworks.CoreServices
      ])
    ];
    nativeBuildInputs = [
      openssl
    ] ++ extraNativeBuildInputs;
    doCheck = false;
  }