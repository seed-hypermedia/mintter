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
    rev = "9bb68973dd10f3cb98d2a95e5432bfc765d77064";
    sha256 = "hjGf/pFms9FJcsz0EmZC80cs6Gs5pS8qpnzn/+8aaek=";
  };
in
  rustPlatform.buildRustPackage {
    pname = "tauri-cli";
    version = src.rev;
    src = src;
    sourceRoot = "source/tooling/cli.rs";
    cargoLock = {
      lockFile = "${src}/tooling/cli.rs/Cargo.lock";
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
