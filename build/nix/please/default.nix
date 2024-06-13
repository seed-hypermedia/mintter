{ lib, buildGoModule, fetchFromGitHub, writeShellScriptBin }:

let 
  please = buildGoModule rec {
    pname = "please";
    version = "16.17.1";
    vendorHash = "sha256:0q7sr7rvl9794s03lj7i28q9hyc6smx56hz810q7ph2qm25s3c9z";

    src = fetchFromGitHub {
      owner = "thought-machine";
      repo = pname;
      rev = "v${version}";
      sha256 = "0a2rv7bj7jl7k3ifixb94nly020vvbqgdnizrlfni9rcwv0hbg49";
    };

    subPackages = [
      "src"
    ];

    postInstall = "mv $out/bin/src $out/bin/plz";
  };

  doCheck = false;

  runScript = writeShellScriptBin "plz" ''
    exec ${please}/bin/src $@
  '';
in
  please
