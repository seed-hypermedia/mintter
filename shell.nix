with import ./build/nix/nixpkgs.nix {};

let
  shellCommon = {
    tools = [
      bash
      coreutils
      findutils
      go
      nodejs
      yarn
      golangci-lint
      please
      python3
      bazel-buildtools
      nix-prefetch
      (rust-stable.override {
        extensions = ["rust-src"];
      })
      tauri-cli
    ];
    libs = [
      # libiconv
    ];
  };
  shellDarwin = {
    tools = [
      impure-cc
    ];
    libs = [
      # darwin.apple_sdk.frameworks.AppKit
      # darwin.apple_sdk.frameworks.CoreFoundation
      # darwin.apple_sdk.frameworks.CoreVideo
      # darwin.apple_sdk.frameworks.CoreGraphics
      # darwin.apple_sdk.frameworks.Security
      # darwin.apple_sdk.frameworks.WebKit
      # darwin.apple_sdk.frameworks.Carbon
      # darwin.apple_sdk.frameworks.QuartzCore
      # darwin.apple_sdk.frameworks.Foundation
    ];
  };
  shellLinux = {
    tools = [
      gcc
      pkg-config
    ];
    libs = [
      gtk3.dev
      openssl.dev
      webkitgtk.dev
      glib.dev
      cairo.dev
      pango.dev
      libappindicator.dev
      libappindicator-gtk3.dev
      libcanberra
    ];
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
    shellHook = ''
      export CGO_ENABLED="1"
      export WORKSPACE="$(pwd)"
      mkdir -p plz-out
      touch plz-out/go.mod
      rm -rf bazel-* .bazel-cache bin
    '';
  }
