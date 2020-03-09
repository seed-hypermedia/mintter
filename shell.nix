let
    pkgs = import ./nix/nixpkgs.nix;
    redo = pkgs.callPackage ./nix/redo {};
    protoc-gen-grpc-web = pkgs.callPackage ./nix/protoc-gen-grpc-web {};
    go = pkgs.go_1_14;
    buildGoModule = (pkgs.buildGoModule.override { go = go; });
    go-protobuf = pkgs.callPackage ./nix/go-protobuf { buildGoModule = buildGoModule; };
    shell = pkgs.mkShell rec {
        buildInputs = [
            protoc-gen-grpc-web
            pkgs.nodejs-13_x
            (pkgs.yarn.override { nodejs = pkgs.nodejs-13_x; })
            go
            go-protobuf
            pkgs.python2
            pkgs.protobuf3_11
            (redo.override {
                python27 = pkgs.python2;
                doCheck = false;
            })
        ];

        shellHook = ''
        export PATH="$PWD/node_modules/.bin/:$PATH"
        unset GOPATH
        '';
    };
in
    shell