self: super: {
  go = super.go_1_18;
  nodejs = super.nodejs-16_x;
  bazel-wrapper = super.callPackage ./bazel-wrapper {};
  impure-cc = super.callPackage ./impure-cc {};
  golangci-lint = super.golangci-lint.override {
    buildGoModule = self.buildGo117Module;
  };
  mkShell = super.mkShell.override {
    stdenv = super.stdenvNoCC;
  };
  please = super.callPackage ./please {
    buildGoModule = self.buildGo117Module;
  };
  robo = super.callPackage ./robo {
    buildGoModule = self.buildGo117Module;
  };
  mkLazyWrapper = super.callPackage ./mk-lazy-wrapper {};
  rust-stable = (super.rust-bin.stable.latest.default.overrideAttrs (oldAttrs: {
    propagatedBuildInputs = [];
    depsHostHostPropagated = [];
    depsTargetTargetPropagated = [];
  }));
  tauri-cli = (super.callPackage ./tauri-cli {}).override {
    extraNativeBuildInputs = [
      self.rust-stable
    ];
  };
}
