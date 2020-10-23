exec >&2

# This will build each subdirectory using default.do rule.

TARGETS="$()"

find -maxdepth 1 -type d ! -path . | xargs -I{} redo-ifchange {}.build
