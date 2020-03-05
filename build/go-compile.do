redo-ifchange ../shell.nix
cat >$3 <<-EOF
#!/bin/sh

nix-shell ../shell.nix --run "go build \$@"
EOF
chmod a+x $3