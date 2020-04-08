exec >&2

git submodule init && git submodule update
redo-ifchange ../.gitmodules go-threads/go.mod
