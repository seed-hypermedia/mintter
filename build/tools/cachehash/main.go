// Command cachehash implements a helper tool for a build system.
// It aims to solve the problem that Ninja reruns the builds based on mtime of sources
// and GN doesn't have globs for obvious reasons (it's a templating system).
// This tool expects a list of glob patterns, and will produce a single hash for them
// that can be used by the build system to avoid running builds if sources hasn't changed.
// It avoids hashing sources if mtime hasn't changed from the previous run.
package main

import (
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"
	"sort"
	"strings"

	"github.com/bmatcuk/doublestar"
	"github.com/burdiyan/go/mainutil"
)

type record struct {
	Stamp string
	Hash  string
}

type manifest map[string]record

func (m manifest) Sum() []byte {
	hashes := make([]string, len(m))
	var i int
	for _, rec := range m {
		hashes[i] = rec.Hash
		i++
	}
	sort.Strings(hashes)
	stamp := strings.Join(hashes, ",")
	sum := sha1.Sum([]byte(stamp))
	return sum[:]
}

func main() {
	mainutil.Run(run)
}

// TODO: implement exclude patterns and optimize by checking directory mtime before diving deeper.

func run() error {
	flag.Usage = func() {
		fmt.Fprintf(flag.CommandLine.Output(), "Usage: cachehash [FLAGS...] PATTERNS...\n")
		flag.PrintDefaults()
	}

	var (
		cacheFileName string
		verbose       bool
		outFile       string
		force         bool
	)

	flag.StringVar(&cacheFileName, "cache-file", "cachehash.state.json", "cache file to speed up subsequent runs (set to empty string to skip writing)")
	flag.StringVar(&outFile, "o", "", "output into specified file instead of stdout")
	flag.BoolVar(&verbose, "v", false, "output logs to stderr")
	flag.BoolVar(&force, "force", false, "force output even if the nothing changed from the previous run")
	flag.Parse()

	if !verbose {
		log.SetOutput(ioutil.Discard)
	}

	patterns := os.Args[1:]

	if len(patterns) == 0 {
		flag.Usage()
		os.Exit(1)
	}

	var dirty, replace bool

	oldMan, err := readManifest(cacheFileName)
	if err != nil {
		if os.IsNotExist(err) {
			dirty, replace = true, true
		} else {
			return err
		}
	}

	newMan := manifest{}

	for _, p := range patterns {
		matches, err := doublestar.Glob(p)
		if err != nil {
			return err
		}

		for _, f := range matches {
			info, err := os.Stat(f)
			if err != nil {
				return err
			}
			if info.IsDir() {
				continue
			}

			oldRec := oldMan[f]
			newRec := record{
				Stamp: fmt.Sprintf("%d-%d-%d", info.ModTime().UnixNano(), info.Size(), info.Mode()),
			}

			if oldRec.Stamp == newRec.Stamp {
				newRec.Hash = oldRec.Hash
				newMan[f] = newRec
				continue
			}

			replace = true
			newRec.Hash, err = hashFile(f)
			if err != nil {
				return err
			}

			newMan[f] = newRec
			if oldRec.Hash != newRec.Hash {
				dirty, replace = true, true
			}
		}
	}

	if len(oldMan) != len(newMan) {
		dirty, replace = true, true
	}

	if !replace {
		log.Println("No work to do")
		if force {
			return writeSum(outFile, newMan)
		}
		return nil
	}

	log.Println("Writing manifest file")
	if err := writeManifest(cacheFileName, newMan); err != nil {
		return err
	}

	if !dirty && !force {
		return nil
	}

	return writeSum(outFile, newMan)
}

func hashFile(filename string) (string, error) {
	f, err := os.Open(filename)
	if err != nil {
		return "", err
	}
	defer f.Close()

	hash := sha1.New()
	if _, err := io.Copy(hash, f); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

func readManifest(filename string) (manifest, error) {
	f, err := os.Open(filename)
	defer f.Close()

	if err != nil {
		return nil, err
	}

	var m manifest
	if err := json.NewDecoder(f).Decode(&m); err != nil {
		return nil, err
	}

	return m, nil
}

func writeManifest(filename string, m manifest) error {
	if filename == "" {
		return nil
	}

	f, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")

	return enc.Encode(m)
}

func writeSum(outFile string, m manifest) error {
	const format = "%x\n"
	sum := m.Sum()
	if outFile == "" || outFile == "-" {
		_, err := fmt.Printf(format, sum)
		return err
	}

	out, err := os.Create(outFile)
	if err != nil {
		return err
	}
	defer out.Close()

	log.Println("Writing sum file")
	_, err = fmt.Fprintf(out, format, sum)
	return err
}
