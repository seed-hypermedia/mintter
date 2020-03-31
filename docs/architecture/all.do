TARGETS=$(find . -type f -name "*.puml" | sed 's/\.puml/\.png/')

echo $TARGETS | xargs redo-ifchange
