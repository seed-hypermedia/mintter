#!/bin/bash

# Check if a file name is provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 path_to_log_file"
    exit 1
fi

# Path to the log file is the first script argument
log_file="$1"

# Declare an associative array to hold the counts
declare -A dbg_counts

# Initialize the counts for each dbg reference
for i in {1..55}; do
    dbg_counts["dbg$i"]=0
done

# Process the log file
while read -r line; do
    if [[ $line =~ dbg([0-9]+) ]]; then
        # Increment the count for the extracted dbg reference
        dbg_ref="dbg${BASH_REMATCH[1]}"
        dbg_counts[$dbg_ref]=$((dbg_counts[$dbg_ref] + 1))
    fi
done < "$log_file"

# Check if counts are even or odd
for dbg_ref in "${!dbg_counts[@]}"; do
    count=${dbg_counts[$dbg_ref]}
    if (( count % 2 == 0 )); then
        echo "$dbg_ref has an even number of traces: $count"
    else
        echo "$dbg_ref has an odd number of traces: $count"
    fi
done
