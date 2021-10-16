{ pkgs, lib, naersk, fetchFromGitHub }:

rec {
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
