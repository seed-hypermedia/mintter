// Package logging is the logging library used by Mintter
package logging

import (
	"time"

	ipfslog "github.com/ipfs/go-log/v2"
	"go.uber.org/zap"
)

// StandardLogger provides API compatibility with standard printf loggers
// eg. go-logging
type StandardLogger interface {
	Debug(msg string, fields ...zap.Field)
	Debugf(format string, args ...interface{})
	Error(msg string, fields ...zap.Field)
	Errorf(format string, args ...interface{})
	Fatal(msg string, fields ...zap.Field)
	Fatalf(format string, args ...interface{})
	Info(msg string, fields ...zap.Field)
	Infof(format string, args ...interface{})
	Panic(msg string, fields ...zap.Field)
	Panicf(format string, args ...interface{})
	Warn(msg string, fields ...zap.Field)
	Warnf(format string, args ...interface{})
}

// EventLogger extends the StandardLogger interface to allow for log items
// containing structured metadata
type EventLogger interface {
	StandardLogger
}

// Logger retrieves an event logger by name
func Logger(system string) *ZapEventLogger {
	if len(system) == 0 {
		setuplog := getLogger("setup-logger")
		setuplog.Error("Missing name parameter")
		system = "undefined"
	}

	logger := getLogger(system)

	return &ZapEventLogger{
		system: system,
		Logger: *logger,
	}
}

// ZapEventLogger implements the EventLogger and wraps a go-logging Logger
type ZapEventLogger struct {
	zap.Logger
	system string
}

////////////////////////////////////////////////////////////////////////////////////
// Add more functions if wanted, pick them from
// https://github.com/uber-go/zap/blob/89e382035d3a984a01e6c9c8be5462f11efac844/sugar.go#L106

func (logger *ZapEventLogger) Debug(msg string, fields ...zap.Field) {
	logger.Logger.Debug(msg, fields...)
}

func (logger *ZapEventLogger) Info(msg string, fields ...zap.Field) {
	logger.Logger.Info(msg, fields...)
}

func (logger *ZapEventLogger) Warn(msg string, fields ...zap.Field) {
	logger.Logger.Warn(msg, fields...)
}

func (logger *ZapEventLogger) Error(msg string, fields ...zap.Field) {
	logger.Logger.Error(msg, fields...)
}

func SetupIPFSLogging(cfg ipfslog.Config) {
	ipfslog.SetupLogging(cfg)

	/*
		IPFS Subsystems:

		autonat blankhost p2p-config ping stream-upgrader swarm2 dht.pb quic-transport connmgr
		test-logger nat discovery routedhost diversityFilter peerstore/ds engine reprovider.simple
		reuseport-transport tcp-tpt dht/RtRefreshManager blockstore provider.simple bs:sprmgr chunk
		ipns blockservice bitswap mplex basichost relay autorelay providers dht bs:peermgr bs:sess
		addrutil routing/record table badger provider.queue peerstore bitswap_network net/identify
		secio pubsub eventlog common]
	*/

	//ipfslog.SetAllLoggers(lvl)
	// We can enable log subsystems one by one:
	//
	// var Logger = ipfslog.Logger("common")
	// _ = ipfslog.SetLogLevel("common", "info")
}

// FormatRFC3339 returns the given time in UTC with RFC3999Nano format.
func FormatRFC3339(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}
