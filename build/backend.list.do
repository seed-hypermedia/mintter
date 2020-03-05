redo-always

cat > $3 <<-EOF 
../go.mod
../go.sum
`find ../backend -type f ! -name "*.do" ! -path . | sort`
EOF

redo-stamp <$3