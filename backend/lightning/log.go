package lightning

import (
	"io"
	"sync"

	"mintter/backend/config"

	"github.com/btcsuite/btclog"
	"github.com/lightningnetwork/lnd/build"
)

var (
	initBackend sync.Once
	logWriter   *build.RotatingLogWriter
	initError   error
)

/*
Writer is the implementatino of io.Writer interface required for logging
*/
type Writer struct {
	writer io.Writer
}

func (w *Writer) Write(b []byte) (int, error) {
	//os.Stdout.Write(b)
	if w.writer != nil {
		w.writer.Write(b)
	}
	return len(b), nil
}

/*
GetLogger ensure log backend is initialized and return a logger.
*/
func GetLogger(cfg *config.LND, logger string) (btclog.Logger, error) {
	initLog(cfg)
	if initError != nil {
		return nil, initError
	}
	return logWriter.GenSubLogger(logger, func() {}), nil

}

/*
GetLogWriter ensure log backend is initialized and return the writer singleton.
This writer is sent to other systems to they can use the same log file.
*/
func GetLogWriter(cfg *config.LND) (*build.RotatingLogWriter, error) {
	initLog(cfg)
	return logWriter, initError
}

func initLog(cfg *config.LND) {
	initBackend.Do(func() {
		buildLogWriter := build.NewRotatingLogWriter()

		filename := cfg.LndDir + "/logs/bitcoin/" + cfg.Network + "/lnd.log"
		err := buildLogWriter.InitLogRotator(filename, 10, 3)
		if err != nil {
			initError = err
			return
		}
		logWriter = buildLogWriter
	})
}
