exec >&2

redo-ifchange $REDO_BASE/yarn $REDO_BASE/frontend/packages/all $REDO_BASE/out/native/proto/v2/js.protobuf all-sources.list
redo-ifchange `cat all-sources.list`

yarn run next build

redo-output .next/BUILD_ID