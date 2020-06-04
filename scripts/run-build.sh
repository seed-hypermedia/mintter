#!/bin/sh

# Build everything for production and run locally.

set -e

MINTTER_OS=`uname -s | tr '[:upper:]' '[:lower:]'`
redo -j20 build/$MINTTER_OS/mintterd
./build/$MINTTER_OS/mintterd $@
