exec >&2

redo-ifchange next.build
yarn run next export
redo-ifchange out/index.html