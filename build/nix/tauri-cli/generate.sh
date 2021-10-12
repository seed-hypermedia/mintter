#!/usr/bin/env nix-shell
#!nix-shell -p crate2nix -i bash

# Use this script to generate nix derivation for tauri-cli crate.
# It will use crate2nix to benefit from the ganular dependency caching.
# This script can be executed from anywhere.
# Optionally you can pass desired version of tauri-cli as the first argument for this script.

set -e

# Go to this directory, so we can execute the script from anywhere.
cd "$(dirname "$0")"

bump() {
    crate2nix source add cratesIo tauri-cli $1
}

# Bump crate version if first argument is passed.
[ -z "$1" ] || bump $1

# Fetch sources and generate nix derivations.
crate2nix generate

# Remove unnecessary source files after generation.
rm -rf crate2nix-sources*
