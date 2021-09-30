{ stdenv, lib, python27, fetchFromGitHub, which, findutils }: let

  # copy from 
  # pkgs/applications/networking/pyload/beautifulsoup.nix
  beautifulsoup = python27.pkgs.callPackage ./beautifulsoup.nix {
    pythonPackages = python27.pkgs;
  };

in stdenv.mkDerivation rec {
  pname = "redo";
  version = "0.42";

  src = fetchFromGitHub rec {
    # Fork of redo with experimental implementation of redo-output command.
    owner = "burdiyan";
    repo = "redo";
    rev = "redo-output";
    sha256 = "sha256:0ddh356sjxvdphf09mn39kms2svwmqahalfy9j0wqd8gbxsd5f7h";
  };

  preInstall = "";

  outputs = [ "out" "man" ];

  installFlags = [
    "PREFIX=$(out)"
    "DESTDIR=/"
  ];

  nativeBuildInputs = [
    python27
    beautifulsoup
    which
    findutils
  ];

  meta = with lib; {
    description = "Smaller, easier, more powerful, and more reliable than make. An implementation of djb's redo.";
    homepage = https://github.com/apenwarr/redo;
  };
}
