#!/usr/bin/env bash

# This script is not executable by itself. It will be included from within the `dev` CLI.

set -e 

BIN="out/linux_amd64/mintterd"

[ -z "$BIN" ] && echo "Argument with path to the binary is expected!" && exit 1

ALICE_ADDR="root@159.89.8.72"

echo "Transferring the binary..."
scp $BIN $ALICE_ADDR:/usr/local/bin/mintterd.new

echo "Restarting the systemd service..."
ssh $ALICE_ADDR "mv /usr/local/bin/mintterd.new /usr/local/bin/mintter && systemctl restart mintterd.service"
