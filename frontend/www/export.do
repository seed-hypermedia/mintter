exec >&2

redo-ifchange build
echo "Running next export" >&2
yarn run next export
redo-output out/index.html
nix-hash out | redo-stamp