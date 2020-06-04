exec >&2

redo-ifchange next.build
echo "Running next export" >&2
yarn run next export
redo-ifchange out/index.html