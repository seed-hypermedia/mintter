#!/bin/sh

# Build everything for production and run locally.

set -e

redo -j20
exec out/native/backend/cmd/mintterd/mintterd $@