redo-ifchange go-compile backend.list
redo-ifchange `cat backend.list`

./go-compile "-o $3 ../backend/cmd/mtt/"
