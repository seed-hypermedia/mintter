self: super: {
  go = super.go_1_20;
  nodejs = super.nodejs_20;
  bazel-wrapper = super.callPackage ./bazel-wrapper {};
  impure-cc = super.callPackage ./impure-cc {};
  golangci-lint = super.golangci-lint.override {
    buildGoModule = self.buildGo120Module;
  };
  mkShell = super.mkShell.override {
    stdenv = super.stdenvNoCC;
  };
  please = super.callPackage ./please {
    buildGoModule = self.buildGo120Module;
  };
  robo = super.callPackage ./robo {
    buildGoModule = self.buildGo120Module;
  };
  mkLazyWrapper = super.callPackage ./mk-lazy-wrapper {};
}
