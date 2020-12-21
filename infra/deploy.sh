#!/usr/bin/env bash

# This script is not executable by itself. It will be included from within the `dev` CLI.

set -e 

BIN="out/linux_amd64/mintterd"

[ -z "$BIN" ] && echo "Argument with path to the binary is expected!" && exit 1
[ -z "$DEPLOY_ADDR" ] && echo "$DEPLOY_ADDR must be set!" && exit 1

echo "Transferring the binary..."
scp $BIN "root@$DEPLOY_ADDR":/usr/local/bin/mintterd.new

echo "Restarting the systemd service..."
ssh "root@$DEPLOY_ADDR" "mv /usr/local/bin/mintterd.new /usr/local/bin/mintterd && systemctl restart mintterd.service"
