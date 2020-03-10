redo-ifchange proto.list
redo-ifchange `cat proto.list`

protoc --go_out=plugins=grpc:. *.proto

redo-ifchange `find . -type f -name "*.pb.go"`