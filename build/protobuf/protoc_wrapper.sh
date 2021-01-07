#!/usr/bin/env bash -e

SOURCE_DIR="$1"
LANGUAGE="$2"

function go() {
    PROTO_OUTPUT_DIR="../api/go/${SOURCE_DIR#../proto/}"

    echo RUNNING proto rule Go

    # Remove previously generated files in case some of the proto files were deleted.
    rm -f $PROTO_OUTPUT_DIR/*.pb.go

    protoc -I ../proto/ --go_out=module=mintter,plugins=grpc:../ $SOURCE_DIR/*.proto
}

function js() {
    PROTO_OUTPUT_DIR="../api/js/${SOURCE_DIR#../proto/}"

    echo RUNNING proto rule JS

    # Remove previously generated files in case some of the proto files were deleted.
    rm -f $PROTO_OUTPUT_DIR/*_pb.*
    mkdir -p $PROTO_OUTPUT_DIR

    protoc -I ../proto/ \
        --js_out=import_style=commonjs:../api/js \
        --grpc-web_out=import_style=commonjs+dts,mode=grpcwebtext:../api/js \
        $SOURCE_DIR/*.proto
}

$LANGUAGE