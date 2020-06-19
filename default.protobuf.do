DIR=`dirname $2`
PROTO_LANG=`basename $2`


function go_proto() {
    redo-ifchange $DIR/all.protolist
    echo Building Go >&2
    protoc -I . --go_out=module=mintter,plugins=grpc:. $DIR/*.proto
    redo-ifchange `find $DIR -type f -name "*.pb.go" -o -name "*.proto"`
}

function js_proto() {
    redo-ifchange $DIR/all.protolist
    echo Building JS >&2
    protoc \
        --js_out=import_style=commonjs:. \
        --grpc-web_out=import_style=commonjs+dts,mode=grpcwebtext:. \
        $DIR/*.proto
    redo-ifchange `find $DIR -type f -name "*.ts" -o -name "*.js" -o -name "*.proto"`
}

function clean() {
    rm -f `find $DIR -type f -name "*.pb.go" -o -name "*_pb.*"`
}

case $PROTO_LANG in
    go) go_proto ;;
    js) js_proto ;;
    clean) clean ;;
    *) echo "no rule to build '$1'" >&2; exit 1 ;;
esac