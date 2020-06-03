exec >&2

redo-ifchange $REDO_BASE/yarn $REDO_BASE/frontend/packages/all deps.list
redo-ifchange `cat deps.list`

yarn run next build

redo-ifchange .next/BUILD_ID