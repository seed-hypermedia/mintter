package backend

import (
	"github.com/ipfs/go-log/v2"
	"go.uber.org/zap"
)

// IPFS's logging library works best when loggers are preinitialized. Otherwise
// there may be a race when setting up logging levels, and building configuration.
var loggers = map[string]*zap.Logger{
	"mintter/patch-store": log.Logger("mintter/patch-store").Desugar(),
	"mintter/p2p":         log.Logger("mintter/p2p").Desugar(),
	"mintter/daemon":      log.Logger("mintter/daemon").Desugar(),
	"mintter/backend":     log.Logger("mintter/backend").Desugar(),
	"mintter/repo":        log.Logger("mintter/repo").Desugar(),
}

func makeLogger(name string) *zap.Logger {
	l := loggers[name]
	if l == nil {
		panic("no logger with name " + name)
	}

	return l
}

func init() {
	if err := log.SetLogLevelRegex("mintter", "debug"); err != nil {
		panic(err)
	}
}
