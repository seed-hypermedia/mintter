with import ./build/nix/nixpkgs.nix {};

let
  shellCommon = {
    tools = [
      bash
      coreutils
      findutils
      go
      nodejs
      nodePackages.pnpm
      golangci-lint
      please
      python3
      bazel-buildtools
      nix-prefetch
      (rust-stable.override {
        extensions = ["rust-src"];
      })
      tauri-cli
      black
    ];
    libs = [];
  };
  shellDarwin = {
    tools = [
      impure-cc
    ];
    libs = [];
  };
  shellLinux = {
    tools = [
      impure-cc
    ];
    libs = [];
  };
in
  mkShell {
    nativeBuildInputs = [
      (lib.optionals hostPlatform.isMacOS shellDarwin.tools)
      (lib.optionals hostPlatform.isLinux shellLinux.tools)
      shellCommon.tools
    ];
    buildInputs = [
      (lib.optionals hostPlatform.isMacOS shellDarwin.libs)
      (lib.optionals hostPlatform.isLinux shellLinux.libs)
      shellCommon.libs
    ];
    hardeningDisable = ["fortify"];
    shellHook = ''
      export CGO_ENABLED="1"
      export WORKSPACE="$(pwd)"
      mkdir -p plz-out
      touch plz-out/go.mod
      rm -rf bazel-* .bazel-cache bin
    '';
  }
