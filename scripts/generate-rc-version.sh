#!/bin/bash

BRANCH_NAME=$1

git fetch --tags origin

# Extract version number from the branch name
VERSION=$(echo $BRANCH_NAME | grep -oP 'release\/\K\d+\.\d+\.\d+')

# Check if there are any releases matching the branch's version pattern
RELEASES=$(git tag --list "$VERSION-rc*" | sort -V)

if [ -z "$RELEASES" ]; then
  # If no releases are found, set the version to <branch_version>-rc0
  VERSION="$VERSION-rc0"
else
  # If there are releases, find the latest release and increment the version
  LATEST_RELEASE=$(echo "$RELEASES" | tail -n 1)
  NEXT_RC_NUMBER=$(echo "$LATEST_RELEASE" | grep -oP '\d+$' | awk '{print $1 + 1}')
  VERSION="$VERSION-rc$NEXT_RC_NUMBER"
fi

echo $VERSION
