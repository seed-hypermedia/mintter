import (builtins.fetchGit {
  # Descriptive name to make the store path easier to identify
  name = "nixpkgs-unstable";
  url = https://github.com/nixos/nixpkgs-channels/;
  # Commit hash for nixos-unstable as of 2020-03-06.
  # `git ls-remote https://github.com/nixos/nixpkgs-channels nixos-unstable`
  ref = "nixpkgs-unstable";
  rev = "a2e06fc3423c4be53181b15c28dfbe0bcf67dd73";
}) {}