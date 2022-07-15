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
  version = "1.0.4";
  src = fetchCrate {
    crateName = pname;
    version = version;
    # To update the hash run nix-prefetch fetchCrate --crateName tauri-cli --version <desired-version>.
    sha256 = "sha256-HZ0XiIHkE7uwgRM9T26MHdS0Yyey+Tw9DsoKO0VTDbQ=";
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
