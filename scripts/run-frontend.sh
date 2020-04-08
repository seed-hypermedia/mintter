#!/bin/sh

set -e

redo -j20 frontend/all

yarn dev