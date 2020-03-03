{
    pkgs ? import <nixpkgs> {},
}:

let
    redo = pkgs.callPackage ./nix/redo {};
    shell = pkgs.mkShell rec {
        buildInputs = [
            pkgs.nodejs-13_x
            (pkgs.yarn.override { nodejs = pkgs.nodejs-13_x; })
            pkgs.go_1_13
            pkgs.python2
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