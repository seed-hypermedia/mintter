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
    rev = "67f14b4ce8e3429401d8f8b02ee1ea54865b1624";
    sha256 = "sha256-+zD97xzRIEof5giIur+O3JIl6c9b7CKGDrSfKaEsjFc=";
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