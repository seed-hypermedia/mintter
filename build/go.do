redo-ifchange ../shell.nix

cat >$3 <<-EOF
	#!/bin/sh
	exec nix-shell ../shell.nix --run "go \$@"
EOF
chmod a+x $3