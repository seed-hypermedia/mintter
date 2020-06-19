redo-always
DIR=`dirname $2`
find $DIR -type f -name "*.proto" | redo-stamp