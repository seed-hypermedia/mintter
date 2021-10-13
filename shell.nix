# We import a pinned version of nixpkgs + our custom overlays.
with import ./build/nix/nixpkgs.nix;

let 
  protoc-gen-ts_proto = writeShellScriptBin "protoc-gen-ts_proto" "yarn run protoc-gen-ts_proto";
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
      protoc-gen-ts_proto
      # pkg-config
      # gcc
    ];
    libs = [
      # libiconv
    ];
  };
  shellDarwin = {
    tools = [
      # impure-cc
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
      export CURRENT_PLATFORM="$(go env GOOS)_$(go env GOARCH)"
      export BAZEL_SH="$(which bash)"
      export CGO_ENABLED="0"

      # Cleanup after migration to yarn2. Remove this after we all use yarn2 for some time.
      rm -rf node_modules `find frontend -type d -name node_modules -prune`
    '';
  }
