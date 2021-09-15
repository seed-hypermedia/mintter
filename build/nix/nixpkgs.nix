import (builtins.fetchGit {
  # Descriptive name to make the store path easier to identify
  name = "nixpkgs-unstable";
  url = https://github.com/nixos/nixpkgs;
  # Commit hash for nixos-unstable as of 2021-09-15.
  # Run `git ls-remote https://github.com/nixos/nixpkgs refs/heads/nixpkgs-unstable`
  # to get the most recent revision.
  ref = "refs/heads/nixpkgs-unstable";
  rev = "071317d543205ee5f5611d391a37582f9b282240";
}) {}