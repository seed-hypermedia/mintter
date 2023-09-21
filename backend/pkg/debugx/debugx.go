// Package debugx provides simple debugging facilities.
// It's not named debug to avoid name clash with the stdlib debug package.
// It's a separate package to allow easily grep-ing for debug statements in the codebase.
package debugx

import (
	"fmt"

	"github.com/sanity-io/litter"
)

var dumpCfg = litter.Config

// Re-exporting common debugging functions from other packages.
var (
	Print   = fmt.Print
	Println = fmt.Println
	Printf  = fmt.Printf
	Dump    = dumpCfg.Dump
)

// DumpAll dumps all the values to stdout with private fields.
func DumpAll(vv ...any) {
	cfg := dumpCfg
	cfg.HidePrivateFields = true
	cfg.Dump(vv...)
}
