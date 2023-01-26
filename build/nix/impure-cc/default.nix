{ stdenv }:

# This derivation exposes system-level C toolchain to Nix. Can be useful
# in Darwin, because ATM there're some consistency problems between Intel and M1 macs in Nix.

stdenv.mkDerivation {
  name = "impure-cc";
  phases = ["installPhase"];
  installPhase = ''
    mkdir -p $out/bin
    ln -s /usr/bin/gcc /usr/bin/clang /usr/bin/cc /usr/bin/ld $out/bin/
  '';
}
