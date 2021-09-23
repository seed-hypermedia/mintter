let
  pkgs = import ./build/nix/nixpkgs.nix;
  protoc-gen-grpc-web = pkgs.callPackage ./build/nix/protoc-gen-grpc-web {};
  node = pkgs.nodejs-16_x;
  yarn = (pkgs.yarn.override { nodejs = node; });
  # This exposes bazelisk as bazel. Bazel itself works weirdly in Nix.
  bazel = pkgs.stdenv.mkDerivation {
    name = "bazel-wrapper";
    buildInputs = [
      pkgs.bazelisk
    ];
    phases = ["installPhase"];
    installPhase = ''
      mkdir -p $out/bin
      ln -s ${pkgs.bazelisk}/bin/bazelisk $out/bin/bazel
    '';
  };
  # This exposes system-level C toolchain. This is needed to fix Tauri builds on M1 Macs
  # which for some reason fails with hermetic C toolchain provided by Nix.
  impure-cc = pkgs.stdenv.mkDerivation {
    name = "impure-cc";
    phases = ["installPhase"];
    installPhase = ''
      mkdir -p $out/bin
      ln -s /usr/bin/gcc /usr/bin/clang /usr/bin/cc $out/bin/
    '';
  };
  # Inputs specifc for Darwin.
  # TODO: we override clang and gcc, because built-in Nix wrappers for some reason fail when building Tauri app.
  # This means that we must be careful when depending on third-party system libraries installed outside Nix.
  darwin = [
    impure-cc
  ];
  # Inputs specific for Linux.
  linux = [
    pkgs.gcc
    pkgs.pkg-config
    pkgs.gtk3
    pkgs.openssl
    pkgs.webkitgtk
    pkgs.libappindicator
    pkgs.libappindicator-gtk3
    pkgs.libcanberra
  ];
in
  pkgs.mkShell {
    nativeBuildInputs = [
      (pkgs.lib.optionals pkgs.stdenv.isDarwin [darwin])
      (pkgs.lib.optionals pkgs.stdenv.isLinux [linux])
      pkgs.bash
      pkgs.coreutils
      pkgs.findutils
      pkgs.protobuf
      pkgs.go_1_17
      pkgs.terraform
      bazel
      pkgs.rustc
      pkgs.cargo
      pkgs.rustfmt
      node
      yarn
    ];
    shellHook = ''
      rm -rf bin
      export CURRENT_PLATFORM="$(go env GOOS)_$(go env GOARCH)"
      export BAZEL_SH="$(which bash)"
      export CGO_ENABLED="0"
    '';
  }
