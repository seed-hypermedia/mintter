# This is a library function that can be used to create lazy-wrappers around other binaries.
# Could be useful for nix-shell. This will make that the package being used would not be
# downloaded or compiled right-away, but only the first time the actual binary is called.
# This can be inconvenient as it can happen that the tool you need right now is not actually ready yet.
# But can be convenient for some cases.

{ runCommandLocal, nix }:

package: bin: runCommandLocal "${bin}-lazy" {
  nativeBuildInputs = [ nix ];
  parentOutPath = builtins.unsafeDiscardStringContext package.outPath;
  parentDrvPath = builtins.unsafeDiscardStringContext package.drvPath;
  parentBin = bin;
} ''
  mkdir -p $out/bin
  cat <<EOF > $out/bin/$parentBin
  #!/bin/sh
  [ -e $parentOutPath/bin/$parentBin ] && $parentOutPath/bin/$parentBin || (nix build --no-link --max-jobs auto $parentDrvPath && $parentOutPath/bin/$parentBin)
  EOF
  chmod +x $out/bin/$parentBin
''
