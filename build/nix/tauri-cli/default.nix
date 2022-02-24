{ 
  pkgs,
  fetchCrate,
  rustPlatform,
  openssl,
  darwin,
  lib,
  hostPlatform,
  extraNativeBuildInputs ? []
}:

rustPlatform.buildRustPackage rec {
  pname = "tauri-cli";
  version = "1.0.0-rc.6";
  src = fetchCrate {
    crateName = pname;
    version = version;
    # To update the hash run nix-prefetch fetchCreate --crateName tauri-cli --version <desired-version>.
    sha256 = "sha256-KWcd3a5MCs545A9IV/jtHYCcCtapaV2MA09po/2JQWw=";
  };
  cargoLock = {
    lockFile = "${src}/Cargo.lock";
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
