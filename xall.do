# Let's automate running configure script for all the supported platforms,
# and then run the all.od rule for each of them.

SUPPORTED_PLATFORMS=`cat <<EOF
darwin_amd64
linux_amd64
windows_amd64
EOF
`

redo-ifchange configured

for p in $SUPPORTED_PLATFORMS; do
    echo out/$p/all
done | xargs redo-ifchange