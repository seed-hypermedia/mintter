let
    pkgs = import ./build/nix/nixpkgs.nix;
    python2 = pkgs.python2;
    protoc-gen-grpc-web = pkgs.callPackage ./build/nix/protoc-gen-grpc-web {};
    node = pkgs.nodejs-12_x;
    yarn = (pkgs.yarn.override { nodejs = node; });
    gn = pkgs.callPackage ./build/nix/gn {};
    
    tools = pkgs.buildEnv rec {
        name = "mintter-tools";
        paths = [
            pkgs.bash
            pkgs.coreutils
            pkgs.findutils
            pkgs.protobuf3_11
            pkgs.go-protobuf
            pkgs.go_1_16
            pkgs.ninja
            python2
            protoc-gen-grpc-web
            node
            yarn
            gn
        ];
    };
in
    tools
