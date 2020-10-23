let
    pkgs = import ./nix/nixpkgs.nix;
    python2 = pkgs.python2;
    redo = pkgs.callPackage ./nix/redo {
        python27 = python2;
    };
    protoc-gen-grpc-web = pkgs.callPackage ./nix/protoc-gen-grpc-web {};
    go = pkgs.go_1_15;
    go-protobuf = pkgs.go-protobuf;
    node = pkgs.nodejs-12_x;
    yarn = (pkgs.yarn.override { nodejs = node; });
    protobuf = pkgs.protobuf3_11;
    coreutils = pkgs.coreutils;
    findutils = pkgs.findutils;
    
    tools = pkgs.buildEnv rec {
        name = "tools";
        paths = [
            coreutils
            findutils
            protoc-gen-grpc-web
            node
            redo
            yarn
            go
            go-protobuf
            python2
            protobuf
        ];
    };
in
    tools
