redo-ifchange proto.list
redo-ifchange `cat proto.list`

protoc \
    --js_out=import_style=commonjs:. \
    --grpc-web_out=import_style=commonjs+dts,mode=grpcwebtext:. \
    *.proto

redo-ifchange `find . -type f -name "*.ts" -o -name "*.js"`