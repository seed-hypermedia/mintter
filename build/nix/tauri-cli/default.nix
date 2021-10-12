{ 
  lib,
  rustPlatform,
  fetchCrate,
  darwin,
  stdenv,
}:

rustPlatform.buildRustPackage rec {
  pname = "tauri-cli";
  version = "1.0.0-beta.7";

  buildInputs = [
    (lib.optionals stdenv.isDarwin [
      darwin.apple_sdk.frameworks.CoreServices
      darwin.apple_sdk.frameworks.Security
    ])
  ];

  src = fetchCrate {
    inherit pname version;
    sha256 = "1b04fhqfqpbb110ngzy26rcys1j1xlcqvr310w2qjgzf0gkp184m";
  };

  cargoSha256 = "1969ipz0hlryykzlfg7wvlw6aq3400azaachhxj40a2kxndrm673";
}
