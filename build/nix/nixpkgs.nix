import (builtins.fetchGit {
  # Descriptive name to make the store path easier to identify
  name = "nixpkgs-unstable";
  url = https://github.com/nixos/nixpkgs;
  # Commit hash for nixos-unstable as of 2021-01-13.
  ref = "refs/heads/nixpkgs-unstable";
  rev = "980c4c3c2f664ccc5002f7fd6e08059cf1f00e75";
}) {}