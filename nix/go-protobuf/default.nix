{ buildGoModule, fetchFromGitHub, lib }:

buildGoModule {
  pname = "go-protobuf";
  version = "1.4.2";

  src = fetchFromGitHub {
    owner = "golang";
    repo = "protobuf";
    rev = "v1.4.2";
    sha256 = "0m5z81im4nsyfgarjhppayk4hqnrwswr3nix9mj8pff8x9jvcjqw";
  };

  modSha256 = "0lnk1zpl6y9vnq6h3l42ssghq6iqvmixd86g2drpa4z8xxk116wf";
  subPackages = ["protoc-gen-go/"];

  meta = with lib; {
    description = "Go plugin for Protobuf compiler";
  };
}
