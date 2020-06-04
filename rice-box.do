redo-ifchange frontend/www/next.export

echo "Embedding static assets into Go code" >&2
go run github.com/GeertJohan/go.rice/rice embed-go

redo-ifchange rice-box.go