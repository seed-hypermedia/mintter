{ lib, buildGoModule, fetchFromGitHub, writeShellScriptBin }:

let 
  please = buildGoModule rec {
    pname = "please";
    version = "16.10.1";
    vendorSha256 = "1vcfb0621g86bhqs36z4cqndj9mpi6lfczwy59124rv7fhdb3z40";

    src = fetchFromGitHub {
      owner = "thought-machine";
      repo = pname;
      rev = "v${version}";
      sha256 = "1zw74ppviacn0y0290qwrs0y2wz2lm4f5vk9fffpqnzh7mixzg75";
    };

    subPackages = [
      "src"
    ];
  };
  runScript = writeShellScriptBin "plz" ''
    export PLZ_RAND=$(date)
    ${please}/bin/src $@
  '';
in
  runScript
