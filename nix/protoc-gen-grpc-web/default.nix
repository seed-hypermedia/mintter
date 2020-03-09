{ stdenv }:

let
    platform = stdenv.targetPlatform;
    arch = platform.parsed.cpu.name;
    os = platform.parsed.kernel.name;
in stdenv.mkDerivation rec {
    pname = "protoc-gen-grpc-web";
    version = "1.0.7";

    src = builtins.fetchurl {
        url = "https://github.com/grpc/grpc-web/releases/download/${version}/protoc-gen-grpc-web-${version}-${os}-${arch}";
        sha256 = "sha256:b6d399af774c567332df99746269876b13defefbeba6e0cc62ff9dfc524166c8";
    };

    phases = ["installPhase"];

    installPhase = ''
        mkdir -p $out/bin
        cp $src $out/bin/protoc-gen-grpc-web
        chmod +x $out/bin/protoc-gen-grpc-web
    '';

    meta = {
        description = "Protoc compiler for GRPC Web";
    };
}