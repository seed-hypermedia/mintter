import (builtins.fetchGit {
  # Descriptive name to make the store path easier to identify
  name = "nixpkgs-unstable";
  url = https://github.com/nixos/nixpkgs;
  # Commit hash for nixos-unstable as of 2021-05-07.
  ref = "refs/heads/nixpkgs-unstable";
  rev = "123db833485edf8df83f95ef2888113390768686";
}) {}