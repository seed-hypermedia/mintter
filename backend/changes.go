package backend

//go:generate protoc --go_out=:. --go-vtproto_out=:. --go-vtproto_opt=features=pool+marshal+unmarshal+size changes.proto
