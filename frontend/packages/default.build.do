exec >&2

[ -e $2 ] || (echo "$2 does not exist" >&2; exit 1)

redo-ifchange $REDO_BASE/yarn $REDO_BASE/out/native/proto/v2/js.protobuf $2.list
redo-ifchange `cat $2.list`

cd $2
yarn build
redo-output ./dist/index.js
nix-hash dist | redo-stamp