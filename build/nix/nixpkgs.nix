import (builtins.fetchGit {
  # Descriptive name to make the store path easier to identify
  name = "nixpkgs-unstable";
  url = https://github.com/nixos/nixpkgs;
  # Commit hash for nixos-unstable as of 2021-08-19.
  # Run `git ls-remote https://github.com/nixos/nixpkgs refs/heads/nixpkgs-unstable`
  # to get the most recent revision.
  ref = "refs/heads/nixpkgs-unstable";
  rev = "253aecf69ed7595aaefabde779aa6449195bebb7";
}) {}