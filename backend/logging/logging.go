// Package logging is the logging library used by Mintter
package logging

import (
	"time"

	ipfslog "github.com/ipfs/go-log"
	"go.uber.org/zap"
)

// TODO: Comprobar que envía a loki y borrar esto
//var DisabledTelemetry = false

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

	/*
		var lokiLogger *zap.Logger

		if !DisabledTelemetry {
			var err error
			lokiLogger, err = monitoring.NewLokiLogger()
			if err != nil {
				setuplog := getLogger("setup-logger")
				setuplog.Error("Loki logger failed to create")
				system = "undefined"
			}
		}
	*/

	logger := getLogger(system)

	return &ZapEventLogger{
		system: system,
		Logger: *logger,
		//LokiLogger: lokiLogger,
	}
}

// ZapEventLogger implements the EventLogger and wraps a go-logging Logger
type ZapEventLogger struct {
	zap.Logger
	//LokiLogger *zap.Logger
	system string
}

////////////////////////////////////////////////////////////////////////////////////
// Add more functions if wanted, pick them from
// https://github.com/uber-go/zap/blob/89e382035d3a984a01e6c9c8be5462f11efac844/sugar.go#L106

// TODO: Review this function, shouldn't be needed since NewLokiDataStream already adds it
/*
func appendHostname(fields []zap.Field) []zap.Field {
	hostname, _ := os.Hostname()
	fields = append(fields, zap.String("hostname", hostname))
	return fields
}
*/

func (logger *ZapEventLogger) Debug(msg string, fields ...zap.Field) {
	logger.Logger.Debug(msg, fields...)
	/*
		if logger.LokiLogger != nil {
			fields = appendHostname(fields)
			logger.LokiLogger.Debug(msg, fields...)
		}
	*/
}

func (logger *ZapEventLogger) Info(msg string, fields ...zap.Field) {
	logger.Logger.Info(msg, fields...)
	/*
		if logger.LokiLogger != nil {
			fields = appendHostname(fields)
			logger.LokiLogger.Info(msg, fields...)
		}
	*/
}

func (logger *ZapEventLogger) Warn(msg string, fields ...zap.Field) {
	logger.Logger.Warn(msg, fields...)
	/*
		if logger.LokiLogger != nil {
			fields = appendHostname(fields)
			logger.LokiLogger.Warn(msg, fields...)
		}
	*/
}

func (logger *ZapEventLogger) Error(msg string, fields ...zap.Field) {
	logger.Logger.Error(msg, fields...)
	/*
		if logger.LokiLogger != nil {
			fields = appendHostname(fields)
			logger.LokiLogger.Warn(msg, fields...)
		}
	*/
}

func init() {
	/*
		IPFS Subsystems:

		autonat blankhost p2p-config ping stream-upgrader swarm2 dht.pb quic-transport connmgr
		test-logger nat discovery routedhost diversityFilter peerstore/ds engine reprovider.simple
		reuseport-transport tcp-tpt dht/RtRefreshManager blockstore provider.simple bs:sprmgr chunk
		ipns blockservice bitswap mplex basichost relay autorelay providers dht bs:peermgr bs:sess
		addrutil routing/record table badger provider.queue peerstore bitswap_network net/identify
		secio pubsub eventlog common]
	*/

	ipfslog.SetAllLoggers(ipfslog.LevelInfo)

	// We can enable log subsystems one by one:
	//
	// var Logger = ipfslog.Logger("common")
	// _ = ipfslog.SetLogLevel("common", "info")
}

// FormatRFC3339 returns the given time in UTC with RFC3999Nano format.
func FormatRFC3339(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}
