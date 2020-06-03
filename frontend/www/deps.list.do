redo-always

cat > $3 <<-EOF
`find . -type f ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.next/*" ! -path "*/out/*" \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \)`
package.json
tsconfig.json
EOF

redo-stamp <$3