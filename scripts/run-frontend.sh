#!/bin/sh

set -e

redo -j20 frontend/packages/all

yarn dev