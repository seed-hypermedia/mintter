redo-ifchange frontend/www/export

echo "$(date --rfc-3339=ns) Embedding static assets into Go code..." >&2
go run github.com/GeertJohan/go.rice/rice embed-go
mv rice-box.go $3