package logging

import (
	"errors"
	"fmt"
	"os"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func init() {
	// SetupLogging(configFromEnv())
}

type LogFormat int

const (
	ColorizedOutput LogFormat = iota
	PlaintextOutput
	JSONOutput
)

type Config struct {
	// Format overrides the format of the log output. Defaults to ColorizedOutput
	Format LogFormat

	// Level is the minimum enabled logging level.
	Level LogLevel

	// Stderr indicates whether logs should be written to stderr.
	Stderr bool

	// Stdout indicates whether logs should be written to stdout.
	Stdout bool

	// File is a path to a file that logs will be written to.
	File string

	// URL with schema supported by zap. Use zap.RegisterSink
	URL string

	// Labels is a set of key-values to apply to all loggers
	Labels map[string]string
}

// ErrNoSuchLogger is returned when the util pkg is asked for a non existant logger
var ErrNoSuchLogger = errors.New("Error: No such logger")

var loggerMutex sync.RWMutex // guards access to global logger state

// loggers is the set of loggers in the system
var loggers = make(map[string]*zap.Logger)
var levels = make(map[string]zap.AtomicLevel)

// primaryFormat is the format of the primary core used for logging
var primaryFormat LogFormat = ColorizedOutput

// defaultLevel is the default log level
var defaultLevel LogLevel = LevelDebug

// primaryCore is the primary logging core
var primaryCore zapcore.Core

// loggerCore is the base for all loggers created by this package
var loggerCore = &lockedMultiCore{}

// SetupLogging will initialize the logger backend and set the flags.
// TODO calling this in `init` pushes all configuration to env variables
// - move it out of `init`? then we need to change all the code (js-ipfs, go-ipfs) to call this explicitly
// - have it look for a config file? need to define what that is
func SetupLogging(cfg Config) {
	loggerMutex.Lock()
	defer loggerMutex.Unlock()

	primaryFormat = cfg.Format
	defaultLevel = cfg.Level

	outputPaths := []string{}

	if cfg.Stderr {
		outputPaths = append(outputPaths, "stderr")
	}
	if cfg.Stdout {
		outputPaths = append(outputPaths, "stdout")
	}

	// check if we log to a file
	if len(cfg.File) > 0 {
		if path, err := normalizePath(cfg.File); err != nil {
			fmt.Fprintf(os.Stderr, "failed to resolve log path '%q', logging to %s\n", cfg.File, outputPaths)
		} else {
			outputPaths = append(outputPaths, path)
		}
	}

	if len(cfg.URL) > 0 {
		outputPaths = append(outputPaths, cfg.URL)
	}

	ws, _, err := zap.Open(outputPaths...)
	if err != nil {
		panic(fmt.Sprintf("unable to open logging output: %v", err))
	}

	newPrimaryCore := newCore(primaryFormat, ws, LevelDebug) // the main core needs to log everything.

	for k, v := range cfg.Labels {
		newPrimaryCore = newPrimaryCore.With([]zap.Field{zap.String(k, v)})
	}

	if primaryCore != nil {
		loggerCore.ReplaceCore(primaryCore, newPrimaryCore)
	} else {
		loggerCore.AddCore(newPrimaryCore)
	}
	primaryCore = newPrimaryCore

	setAllLoggers(defaultLevel)
}

// SetDebugLogging calls SetAllLoggers with logging.DEBUG
func SetDebugLogging() {
	SetAllLoggers(LevelDebug)
}

// SetAllLoggers changes the logging level of all loggers to lvl
func SetAllLoggers(lvl LogLevel) {
	loggerMutex.RLock()
	defer loggerMutex.RUnlock()

	setAllLoggers(lvl)
}

func setAllLoggers(lvl LogLevel) {
	for _, l := range levels {
		l.SetLevel(zapcore.Level(lvl))
	}
}

// SetLogLevel changes the log level of a specific subsystem
// name=="*" changes all subsystems
func SetLogLevel(name, level string) error {
	lvl, err := LevelFromString(level)
	if err != nil {
		return err
	}

	// wildcard, change all
	if name == "*" {
		SetAllLoggers(lvl)
		return nil
	}

	loggerMutex.RLock()
	defer loggerMutex.RUnlock()

	// Check if we have a logger by that name
	if _, ok := levels[name]; !ok {
		return ErrNoSuchLogger
	}

	levels[name].SetLevel(zapcore.Level(lvl))

	return nil
}

// GetSubsystems returns a slice containing the
// names of the current loggers
func GetSubsystems() []string {
	loggerMutex.RLock()
	defer loggerMutex.RUnlock()
	subs := make([]string, 0, len(loggers))

	for k := range loggers {
		subs = append(subs, k)
	}
	return subs
}

func getLogger(name string) *zap.Logger {
	loggerMutex.Lock()
	defer loggerMutex.Unlock()
	log, ok := loggers[name]
	if !ok {
		levels[name] = zap.NewAtomicLevelAt(zapcore.Level(defaultLevel))
		log = zap.New(loggerCore).
			WithOptions(
				zap.IncreaseLevel(levels[name]),
				zap.AddCaller(),
			).
			Named(name)
		loggers[name] = log
	}

	return log
}
