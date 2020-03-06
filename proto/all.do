redo-ifchange proto.list
redo-ifchange `cat proto.list`

protoc --go_out=:. *.proto

redo-ifchange `find . -type f -name "*.pb.go"`