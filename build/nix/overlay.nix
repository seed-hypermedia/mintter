self: super: {
  go = super.go_1_22;
  nodejs = super.nodejs_20;
  bazel-wrapper = super.callPackage ./bazel-wrapper {};
  impure-cc = super.callPackage ./impure-cc {};
  golangci-lint = super.golangci-lint.override {
    buildGoModule = self.buildGo122Module;
  };
  mkShell = super.mkShell.override {
    stdenv = super.stdenvNoCC;
  };
  please = super.callPackage ./please {
    buildGoModule = self.buildGo122Module;
  };
  robo = super.callPackage ./robo {
    buildGoModule = self.buildGo122Module;
  };
  mkLazyWrapper = super.callPackage ./mk-lazy-wrapper {};
}
