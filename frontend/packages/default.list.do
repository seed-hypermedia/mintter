redo-always

[ -e $2 ] || (echo "$2 does not exist" >&2; exit 1)

# This will create a list of files the subdir contains.
cat > $3 <<-EOF
`find $2/src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx"`
$2/package.json
$2/tsconfig.json
EOF

redo-stamp <$3
