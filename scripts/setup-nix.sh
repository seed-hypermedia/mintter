#!/usr/bin/env bash

# This script will setup a volume /nix which Nix uses as a store location. Since macOS Catalina
# this workaround is necessary, because you no longer can create volumes in the root directory.
# After running this script install Nix as per documentation.

set -e

./scripts/create-darwin-volume.sh
# Disable spotlight indexing for nix store.
sudo mdutil -i off /nix
# Hide nix store volume from desktop.
sudo SetFile -a V /nix
# Restart finder.
sudo killall Finder
