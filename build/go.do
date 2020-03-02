NIX_GO_PKG="nixpkgs.go_1_13"

cat >$3 <<-EOF
	#!/bin/sh
	exec nix run ${NIX_GO_PKG} -c go "\$@"
EOF
chmod a+x $3