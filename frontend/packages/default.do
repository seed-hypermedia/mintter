exec >&2

[ -e $1 ] || (echo "$1 does not exist" >&2; exit 1)

# This allows to build a subdirectory using its yarn build script.
# Source files are assembled by default.list.do rule.

redo-ifchange $1.list ../yarn
redo-ifchange `cat $1.list`

cd $1

yarn run build

redo-ifchange dist/index.js
