let
    pkgs = import ./build/nix/nixpkgs.nix;
    protoc-gen-grpc-web = pkgs.callPackage ./build/nix/protoc-gen-grpc-web {};
    node = pkgs.nodejs-16_x;
    yarn = (pkgs.yarn.override { nodejs = node; });
    
    tools = pkgs.buildEnv rec {
        name = "mintter-tools";
        paths = [
            pkgs.bash
            pkgs.coreutils
            pkgs.findutils
            pkgs.protobuf3_11
            pkgs.go-protobuf
            pkgs.go
            pkgs.terraform
            pkgs.bazelisk
            node
            yarn
        ];
    };
in
    tools
