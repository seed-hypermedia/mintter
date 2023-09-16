#!/bin/bash

# Check if tag parameter is provided
if [ $# -eq 0 ]; then
    echo "Error: Please provide a tag name as a parameter."
    exit 1
fi

# Get the tag name from the parameter
tag_name=$1

# Pull the latest changes
git pull origin master

# List commits after the specified tag
git log $tag_name..HEAD > whats-new.md
