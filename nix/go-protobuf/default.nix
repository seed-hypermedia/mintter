{ buildGoModule, fetchFromGitHub, lib }:

buildGoModule {
  pname = "go-protobuf";
  version = "1.3.4";

  src = fetchFromGitHub {
    owner = "golang";
    repo = "protobuf";
    rev = "v1.3.4";
    sha256 = "12dclmj2if8l0069fby4psrpqby7p810dr1dr63nwx93g9jhvkmx";
  };

  modSha256 = "0sjjj9z1dhilhpc8pq4154czrb79z9cm044jvn75kxcjv6v5l2m5";

  meta = with lib; {
    description = "Go plugin for Protobuf compiler";
  };
}