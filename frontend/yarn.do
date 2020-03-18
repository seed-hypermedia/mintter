# Initialize Yarn workspace.

exec >&2

redo-ifchange ../package.json ../yarn.lock
cd ..
yarn install
redo-ifchange node_modules/.yarn-integrity
