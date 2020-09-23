import (builtins.fetchGit {
  # Descriptive name to make the store path easier to identify
  name = "nixpkgs-unstable";
  url = https://github.com/nixos/nixpkgs-channels/;
  # Commit hash for nixos-unstable as of 2020-09-23.
  # `git ls-remote https://github.com/nixos/nixpkgs-channels nixos-unstable`
  ref = "refs/heads/nixos-unstable";
  rev = "1179840f9a88b8a548f4b11d1a03aa25a790c379";
}) {}