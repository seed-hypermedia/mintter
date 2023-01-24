self: super: {
  go = super.go_1_19;
  nodejs = super.nodejs-19_x;
  bazel-wrapper = super.callPackage ./bazel-wrapper {};
  impure-cc = super.callPackage ./impure-cc {};
  golangci-lint = super.golangci-lint.override {
    buildGoModule = self.buildGo119Module;
  };
  mkShell = super.mkShell.override {
    stdenv = super.stdenvNoCC;
  };
  please = super.callPackage ./please {
    buildGoModule = self.buildGo119Module;
  };
  robo = super.callPackage ./robo {
    buildGoModule = self.buildGo119Module;
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
