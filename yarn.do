# Initialize Yarn workspace.

exec >&2

redo-ifchange package.json yarn.lock
yarn install
redo-output node_modules/.yarn-integrity
sha256sum package.json yarn.lock | redo-stamp
