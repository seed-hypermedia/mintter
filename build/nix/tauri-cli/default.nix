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
  version = "1.0.0-rc.8";
  src = fetchCrate {
    crateName = pname;
    version = version;
    # To update the hash run nix-prefetch fetchCreate --crateName tauri-cli --version <desired-version>.
    sha256 = "sha256-4JLPOb3F5b6AkoVLDFC6fO+R/q39OHwKBz0NpCNBSFg=";
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
