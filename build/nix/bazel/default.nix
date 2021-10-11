{ stdenv, bazelisk }:

# This derivation exposes bazelisk (Bazel's version manager) as bazel, which is a common practice.

stdenv.mkDerivation {
  name = "bazel-wrapper";
  buildInputs = [
    bazelisk
  ];
  phases = ["installPhase"];
  installPhase = ''
    mkdir -p $out/bin
    ln -s ${bazelisk}/bin/bazelisk $out/bin/bazel
  '';
}
