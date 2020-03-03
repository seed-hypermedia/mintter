{
    pkgs ? import <nixpkgs> {},
    mkShell ? pkgs.mkShell,
}:

mkShell rec {
    buildInputs = [
        pkgs.nodejs-13_x
        (pkgs.yarn.override { nodejs = pkgs.nodejs-13_x; })
        pkgs.go_1_13
        pkgs.python2
    ];

    shellHook = ''
      export PATH="$PWD/node_modules/.bin/:$PATH"
      unset GOPATH
    '';
}