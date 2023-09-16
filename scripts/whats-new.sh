#!/bin/bash

# Pull the latest changes
git pull origin master

# List commits after the specified tag
git log `git describe --tags --match "*.*.*" --abbrev=0`..HEAD > whats-new.txt
