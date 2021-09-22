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
      pkgs.pkg-config
      pkgs.gcc
      pkgs.libiconv
    ] ++ (
      pkgs.lib.optionals pkgs.stdenv.isDarwin [
        pkgs.clang
        pkgs.clang-tools
        pkgs.darwin.libobjc
        pkgs.darwin.apple_sdk.frameworks.Security
        pkgs.darwin.apple_sdk.frameworks.CoreServices
        pkgs.darwin.apple_sdk.frameworks.CoreFoundation
        pkgs.darwin.apple_sdk.frameworks.Foundation
        pkgs.darwin.apple_sdk.frameworks.AppKit
        pkgs.darwin.apple_sdk.frameworks.WebKit
        pkgs.darwin.apple_sdk.frameworks.Cocoa
      ]
    );
    shellHook = ''
      rm -rf bazel
      export CURRENT_PLATFORM="$(go env GOOS)_$(go env GOARCH)"
      export BAZEL_SH="$(which bash)"
    '';

    # export NIX_CFLAGS_COMPILE="-L /usr/lib $NIX_CFLAGS_COMPILE"
    # RUST_SRC_PATH = "${pkgs.rust.packages.stable.rustPlatform.rustLibSrc}";
    # RUSTFLAGS = "-L /usr/lib -L /System/Library";
  }
