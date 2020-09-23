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
    go = pkgs.go_1_15;
    go-protobuf = pkgs.go-protobuf;
    node = pkgs.nodejs-12_x;
    yarn = (pkgs.yarn.override { nodejs = node; });
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
