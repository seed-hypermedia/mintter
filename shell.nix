# We import a pinned version of nixpkgs + our custom overlays.
with import ./build/nix/nixpkgs.nix;

let 
  shellCommon = {
    tools = [
      bash
      coreutils
      findutils
      protobuf
      go
      terraform
      bazel-wrapper
      rustc
      cargo
      rustfmt
      nodejs
      yarn
      tauri-cli
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
      gcc
      pkg-config
    ];
    libs = [
      gtk3
      openssl
      webkitgtk
      libappindicator
      libappindicator-gtk3
      libcanberra
    ];
  };
in
  mkShell {
    nativeBuildInputs = [
      (lib.optionals stdenv.isDarwin shellDarwin.tools)
      (lib.optionals stdenv.isLinux shellLinux.tools)
      shellCommon.tools
    ];
    buildInputs = [
      (lib.optionals stdenv.isDarwin shellDarwin.libs)
      (lib.optionals stdenv.isLinux shellLinux.libs)
      shellCommon.libs
    ];
    shellHook = ''
      export CURRENT_PLATFORM="$(go env GOOS)_$(go env GOARCH)"
      export BAZEL_SH="$(which bash)"
      export CGO_ENABLED="0"

      # Cleanup after migration to yarn2. Remove this after we all use yarn2 for some time.
      rm -rf node_modules `find frontend -type d -name node_modules -prune`
    '';
  }
