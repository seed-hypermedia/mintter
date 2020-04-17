# Find all redo rules called generate.do and execute them.

TARGETS="$(find . -type f -name generate.do ! -path ./generate.do)"

for t in $TARGETS; do
    echo ${t%.do}
done | xargs redo-ifchange