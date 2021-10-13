{ pkgs, lib, darwin, hostPlatform }:

let
  customBuildRustCrateForPkgs = pkgs: pkgs.buildRustCrate.override {
    defaultCrateOverrides = pkgs.defaultCrateOverrides // {
      tauri-cli = attrs: {
        buildInputs = [
          (lib.optionals hostPlatform.isMacOS [
            darwin.apple_sdk.frameworks.CoreServices
            darwin.apple_sdk.frameworks.Security
          ])
        ];
      };
    };
  };
  generatedBuild = import ./Cargo.nix {
    inherit pkgs;
    buildRustCrateForPkgs = customBuildRustCrateForPkgs;
  };
in generatedBuild.rootCrate.build