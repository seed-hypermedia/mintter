{ stdenv, lib, python27, fetchFromGitHub, which, findutils, doCheck ? true}: let

  # copy from 
  # pkgs/applications/networking/pyload/beautifulsoup.nix
  beautifulsoup = python27.pkgs.callPackage ./beautifulsoup.nix {
    pythonPackages = python27.pkgs;
  };

in stdenv.mkDerivation rec {
  pname = "redo";
  version = "0.42";

  src = fetchFromGitHub rec {
    owner = "apenwarr";
    repo = "redo";
    rev = "${repo}-${version}";
    sha256 = "1060yb7hrxm8c7bfvb0y4j0acpxsj6hbykw1d9549zpkxxr9nsgm";
  };

  inherit doCheck;

  checkTarget = "test";

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