{ pkgs, lib, naersk, fetchFromGitHub }:

rec {
  # == How To Update ==
  # 1. Run `nix-prefetch fetchFromGitHub --owner tauri-apps --repo tauri --rev <COMMIT>`. This will print the sha256.
  # 2. Change the values of `rev` and `sha256` in this file accordingly.
  src = fetchFromGitHub {
    owner = "tauri-apps";
    repo = "tauri";
    rev = "acbb3ae7bb0165846b9456aea103269f027fc548";
    sha256 = "0smmm75gvcl4c92w55my2k1aljh88ms1yjml522h38x05hm22fcl";
  };
  cli = naersk.buildPackage {
    pname = "tauri-cli";
    version = src.rev;
    src = src;
    root = "${src}/tooling/cli.rs";
    sourceRoot = "${src}/tooling/cli.rs";
  };
}
