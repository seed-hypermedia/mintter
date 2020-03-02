#!/usr/bin/env bash

set -e

./scripts/create-darwin-volume.sh
# Disable spotlight indexing for nix store.
sudo mdutil -i off /nix
# Hide nix store volume from desktop.
sudo SetFile -a V /nix
# Restart finder.
sudo killall Finder
