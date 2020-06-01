#!/bin/sh

set -e

redo-ifchange third_party/all

go run ./backend/cmd/mintterd --p2p.enable-tls=true --p2p.enable-relay=true --p2p.bootstrap=true $@