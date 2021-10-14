{ lib, buildGoModule, fetchFromGitHub }:

buildGoModule rec {
  pname = "robo";
  version = "0.7.0";
  vendorSha256 = "sha256:1k3ja0lz25021q0g723zgd380iajv993v2mag4zcicbk49srvw0s";

  src = fetchFromGitHub {
    owner = "tj";
    repo = pname;
    rev = "v${version}";
    sha256 = "sha256:01kf736y86fzgav6b8pfky2zj8g4wpfx7j8ndm7kgvgi2wzp95by";
  };

  doCheck = false;
}
