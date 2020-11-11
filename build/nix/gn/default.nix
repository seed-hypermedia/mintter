{ stdenv, unzip }:

let
    platform = stdenv.targetPlatform;
    sha256 = {
        linux-x86_64 = "sha256:06x23wvzp0dbxfs2fvc4yrvym3z000nahnmvai0isd51fna93vs9";
        darwin-x86_64 = "sha256:0arlw3dnsadsrx1n8r030znj5b8c8pm35idk8m87jyq5jzj80pnv";
    };
    gnPlatform = {
        linux-x86_64 = "linux-amd64";
        darwin-x86_64 = "mac-amd64";
    };
    currentPlatform = "${platform.parsed.kernel.name}-${platform.parsed.cpu.name}";
    currentGnPlatform = gnPlatform."${currentPlatform}";
in stdenv.mkDerivation rec {
    pname = "gn";
    version = "e431b2f39f4c8ce3b0b5cfcc7b65242209165c7a";
    nativeBuildInputs = [unzip];
    
    # Work around the "unpacker appears to have produced no directories"
    # case that happens when the archive doesn't have a subdirectory.
    setSourceRoot = "sourceRoot=`pwd`";

    src = builtins.fetchurl {
        url = "https://chrome-infra-packages.appspot.com/dl/gn/gn/${currentGnPlatform}/+/git_revision:${version}";
        name = "gn-${currentGnPlatform}-${version}.zip";
        sha256 = sha256."${currentPlatform}";
    };

    phases = [ "unpackPhase" "installPhase" ];

    installPhase = ''
        mkdir -p $out/bin
        cp gn $out/bin/
        chmod +x $out/bin/gn
    '';

    meta = {
        description = "GN build system";
    };
}