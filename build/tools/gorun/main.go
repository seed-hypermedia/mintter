// goexec is a command line tool to execute Go code. Output is printed as goons to stdout.
package main

import (
	"bytes"
	"flag"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"text/template"

	"golang.org/x/tools/go/packages"
)

var tpl = template.Must(template.New("").Option("missingkey=error").Parse(`package main

import (
	"fmt"
	"os"
	_ "unsafe"

	_ "{{.Package}}"
)

//go:linkname {{.Func}} {{.Package}}.{{.Func}}
func {{.Func}}() error

func main() {
	if err := {{.Func}}(); err != nil {
		fmt.Fprint(os.Stderr, err)
		os.Exit(1)
	}
}
`))

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "Usage: gorun [GO_BUILD_FLAGS] FUNCTION\n\n")
		fmt.Fprintf(os.Stderr, "  FUNCTION: function inside the current package to be executed (unexported funcs are supported too)\n\n")
		if err != flag.ErrHelp {
			fmt.Fprintln(os.Stderr, err.Error())
			os.Exit(1)
		}
	}
}

func isFlag(s string) bool {
	return s[0] == '-'
}

func run() error {
	args := os.Args[1:]

	if len(args) == 0 {
		return flag.ErrHelp
	}

	function := args[len(args)-1]

	if function == "" || isFlag(function) {
		return fmt.Errorf("must specify function name")
	}

	pkgs, err := packages.Load(nil, "./")
	if err != nil {
		panic(err)
	}

	tplArgs := struct {
		Package string
		Func    string
	}{
		Package: pkgs[0].String(),
		Func:    function,
	}

	var b bytes.Buffer
	if err := tpl.Execute(&b, tplArgs); err != nil {
		panic(err)
	}

	// Run the program.
	err = runFile(b.String(), args[:len(args)-1])
	if err != nil {
		fmt.Fprintln(os.Stderr, "### Error ###")
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	return nil
}

func runFile(src string, args []string) error {
	// Create a temp folder.
	tempDir, err := ioutil.TempDir("", "goexec_")
	if err != nil {
		return err
	}
	defer func() {
		err := os.RemoveAll(tempDir)
		if err != nil {
			fmt.Fprintln(os.Stderr, "warning: error removing temp dir:", err)
		}
	}()

	// Write the source code file.
	tempFile := filepath.Join(tempDir, "gen.go")
	err = ioutil.WriteFile(tempFile, []byte(src), 0600)
	if err != nil {
		return err
	}

	// Compile and run the program.
	cmd := exec.Command("go", append([]string{"run"}, append(args, tempFile)...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}
