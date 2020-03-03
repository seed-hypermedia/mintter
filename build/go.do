redo-ifchange ../shell.nix

cat >$3 <<-EOF
	#!/bin/sh
	exec nix-shell --run "go \$@"
EOF
chmod a+x $3