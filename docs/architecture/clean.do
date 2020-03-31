TARGETS=$(find . -type f -name "*.puml" | sed 's/\.puml/\.png/')

rm -f $TARGETS
