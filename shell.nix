# We import a pinned version of nixpkgs + our custom overlays.
with import ./build/nix/nixpkgs.nix;

let 
  common = {
    tools = [
      bash
      coreutils
      findutils
      protobuf
      go
      terraform
      rustc
      cargo
      rustfmt
      nodejs
      yarn
      bazel_4
    ];
    libs = [];
  };
  darwin = {
    tools = [
      impure-cc
    ];
    libs = [];
  };
  linux = {
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
      (lib.optionals stdenv.isDarwin darwin.tools)
      (lib.optionals stdenv.isLinux linux.tools)
      common.tools
    ];
    buildInputs = [
      (lib.optionals stdenv.isDarwin darwin.libs)
      (lib.optionals stdenv.isLinux linux.libs)
      common.libs
    ];
    shellHook = ''
      export CURRENT_PLATFORM="$(go env GOOS)_$(go env GOARCH)"
      export BAZEL_SH="$(which bash)"
      export CGO_ENABLED="0"
    '';
  }
