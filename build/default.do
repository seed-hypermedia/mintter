# Go can uses cache for build so it's safer to run this target always.
redo-always

export GOOS=`dirname $1`
APP=`basename $1`

. ./$APP.od

go build -o $3 $REDO_BASE/backend/cmd/$APP/

redo-stamp <$3