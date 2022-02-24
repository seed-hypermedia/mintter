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
    rev = "080755b5377a3c0a17adf1d03e63555350422f0a";
    sha256 = "yVCReAfuWAkp0Rf5f0/0zwJ0WN2MM156fwXQjpdJwDg=";
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
