let
  pkgs = import ./build/nix/nixpkgs.nix;
  protoc-gen-grpc-web = pkgs.callPackage ./build/nix/protoc-gen-grpc-web {};
  node = pkgs.nodejs-16_x;
  yarn = (pkgs.yarn.override { nodejs = node; });
in
  pkgs.mkShell rec {
    nativeBuildInputs = [
      pkgs.bash
      pkgs.coreutils
      pkgs.findutils
      pkgs.protobuf
      pkgs.go_1_17
      pkgs.terraform
      pkgs.bazelisk
      pkgs.rustc
      pkgs.cargo
      pkgs.rustfmt
      node
      yarn
      # pkgs.pkg-config
      # pkgs.gcc
      # pkgs.libiconv
    ] ++ (
      pkgs.lib.optionals pkgs.stdenv.isDarwin [
        # pkgs.clang
        # pkgs.clang-tools
        # pkgs.darwin.libobjc
        # pkgs.darwin.apple_sdk.frameworks.Security
        # pkgs.darwin.apple_sdk.frameworks.CoreServices
        # pkgs.darwin.apple_sdk.frameworks.CoreFoundation
        # pkgs.darwin.apple_sdk.frameworks.Foundation
        # pkgs.darwin.apple_sdk.frameworks.AppKit
        # pkgs.darwin.apple_sdk.frameworks.WebKit
        # pkgs.darwin.apple_sdk.frameworks.Cocoa
      ]
    );
    # TODO: we override clang and gcc, because built-in Nix wrappers for some reason fail when building Tauri app.
    # This means that we must be careful when depending on third-party system libraries installed outside Nix.
    shellHook = ''
      export CURRENT_PLATFORM="$(go env GOOS)_$(go env GOARCH)"
      export BAZEL_SH="$(which bash)"
      export CGO_ENABLED="0"
      rm -rf bazel
      
      mkdir -p bin
      ln -sf `which bazelisk` bin/bazel
      ln -sf /usr/bin/gcc ./bin/gcc
      ln -sf /usr/bin/clang ./bin/clang
      ln -sf /usr/bin/cc ./bin/cc
    '';
  }
