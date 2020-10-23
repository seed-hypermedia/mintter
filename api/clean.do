for f in `find -type f -name "clean.do" ! -path "./clean.do"`; do
    echo ${f%.do}
done | xargs redo-ifchange