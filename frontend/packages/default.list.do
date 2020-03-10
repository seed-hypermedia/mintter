DIR=${1%.list}

[ -e $DIR ] || (echo "$DIR does not exist" >&2; exit 1)

# This will create a list of files the subdir contains.
cat > $3 <<-EOF
`find ${DIR}/src -type f -name "*.ts"`
${DIR}/package.json
${DIR}/tsconfig.json
EOF

redo-stamp <$3
