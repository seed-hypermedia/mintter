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
  tauri-cli = super.callPackage ./tauri-cli {};
  robo = super.callPackage ./robo {
    buildGoModule = self.buildGo117Module;
  };
}
