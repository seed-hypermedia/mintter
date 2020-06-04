# Make sure protobuf are compiled and checked in before running this rule.
redo-always

cat > $3 <<-EOF 
../go.mod
../go.sum
`find ../backend ../proto -type f -name "*.go" | sort`
`ls ../*.go | sort`
EOF

redo-stamp <$3