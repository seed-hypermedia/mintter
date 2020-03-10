redo-always
find . -type f -name "*.proto" > $3
redo-stamp <$3
