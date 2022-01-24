{}:

self: super: {
  go = super.go_1_17;
  nodejs = super.nodejs-16_x;
  bazel-wrapper = super.callPackage ./bazel-wrapper {};
  impure-cc = super.callPackage ./impure-cc {};
  mkShell = super.mkShell.override {
    stdenv = super.stdenvNoCC;
  };
  buildGo117Module = super.buildGoModule.override {
    go = self.go;
  };
  please = super.callPackage ./please {
    buildGoModule = self.buildGo117Module;
  };
  robo = super.callPackage ./robo {
    buildGoModule = self.buildGo117Module;
  };
  mkLazyWrapper = super.callPackage ./mk-lazy-wrapper {};
  mintterRustChannel = (super.rustChannelOf { date = "2021-12-02"; channel = "stable"; });
  mintterRust = self.mintterRustChannel.rust;
  tauri-cli = (super.callPackage ./tauri-cli {}).override {
    extraNativeBuildInputs = [
      self.mintterRust
    ];
  };
}
