let
    pkgs = import ./nix/nixpkgs.nix;
    python2 = pkgs.python2;
    redo = pkgs.callPackage ./nix/redo {
        python27 = python2;
        doCheck = false;
    };
    protoc-gen-grpc-web = pkgs.callPackage ./nix/protoc-gen-grpc-web {};
    # When updating Go version remember to change .vscode/settings.json with the new
    # GOROOT. Otherwise the extension will pick up globally installed Go and will mangle the shell PATH.
    go = pkgs.go_1_14;
    buildGoModule = (pkgs.buildGoModule.override { go = go; });
    go-protobuf = pkgs.callPackage ./nix/go-protobuf { buildGoModule = buildGoModule; };
    node = pkgs.nodejs-13_x;
    yarn = (pkgs.yarn.override { nodejs = pkgs.nodejs-13_x; });
    protobuf = pkgs.protobuf3_11;
    
    shell = pkgs.mkShell rec {
        buildInputs = [
            protoc-gen-grpc-web
            node
            redo
            yarn
            go
            go-protobuf
            python2
            protobuf
        ];

        shellHook = ''
        export PATH="$PWD/node_modules/.bin/:$PATH"
        unset GOPATH
        unset GOROOT
        '';
    };
in
    shell
