#!/bin/sh

set -e

redo-ifchange third_party/all

exec go run ./backend/cmd/mintterd $@