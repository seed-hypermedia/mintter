exec >&2

git submodule init && git submodule update
redo-ifchange go-threads/go.mod
