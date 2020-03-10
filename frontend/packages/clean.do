TARGETS=`find -maxdepth 1 -type d ! -path .`

for target in $TARGETS; do
    rm -rf $target/dist $target.list
done
