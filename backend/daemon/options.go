package daemon

import (
	"os"
	"path/filepath"
)

type options struct {
	repoPath string
}

// Option is a type for config options.
type Option func(*options)

// WithRepoPath sets the repoPath option.
func WithRepoPath(path string) Option {
	return func(opts *options) {
		opts.repoPath = path
	}
}

func defaultOptions() options {
	var opts options

	opts.repoPath = defaultRepoPath()

	return opts
}

func defaultRepoPath() string {
	d, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	return filepath.Join(d, ".mtt")
}
