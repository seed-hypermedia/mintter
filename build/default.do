# Go can uses cache for build so it's safer to run this target always.
redo-always

APP=`basename $1`
APP="${APP%.exe}"

. ./$APP.od

export GOOS=`dirname $1`
go build -o $3 $REDO_BASE/backend/cmd/$APP/

redo-stamp <$3