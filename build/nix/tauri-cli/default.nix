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
    rev = "61d72b1ee828ae799493e60dda397a29bd54755c";
    sha256 = "sha256-3JX+bB2iXdZcVKCcN0rYCFZFZDf4Zq4oXsFYrNiDTUk=";
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