APP=`basename $1`
APP="${APP%.exe}"

redo-ifchange $REDO_BASE/rice-box go.list
redo-ifchange `cat go.list`

export GOOS=`dirname $1`
echo "Building Go binary ${APP} for ${GOOS}" >&2
go build -o $3 $REDO_BASE/backend/cmd/$APP/
