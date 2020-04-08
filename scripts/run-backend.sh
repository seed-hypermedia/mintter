#!/bin/sh

set -e

redo-ifchange third_party/all

go run ./backend/cmd/mintterd/