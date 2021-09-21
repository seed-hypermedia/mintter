let
  pkgs = import ./build/nix/nixpkgs.nix;
  protoc-gen-grpc-web = pkgs.callPackage ./build/nix/protoc-gen-grpc-web {};
  node = pkgs.nodejs-16_x;
  yarn = (pkgs.yarn.override { nodejs = node; });
    
  shell = pkgs.mkShell rec {
    nativeBuildInputs = [
      pkgs.bash
      pkgs.coreutils
      pkgs.findutils
      pkgs.protobuf
      pkgs.go_1_17
      pkgs.terraform
      pkgs.bazelisk
      node
      yarn
  ];
  shellHook = ''
    export CURRENT_PLATFORM="$(go env GOOS)_$(go env GOARCH)"
    export BAZEL_SH="$(which bash)"
  '';
};
in
  shell
