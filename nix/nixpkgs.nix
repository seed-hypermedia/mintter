import (builtins.fetchGit {
  # Descriptive name to make the store path easier to identify
  name = "nixpkgs-unstable";
  url = https://github.com/nixos/nixpkgs-channels/;
  # Commit hash for nixos-unstable as of 2020-03-06.
  # `git ls-remote https://github.com/nixos/nixpkgs-channels nixos-unstable`
  ref = "nixpkgs-unstable";
  rev = "c667aba79ce4fd8fe0922024e0cb2826daf6a7c5";
}) {}