package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"seed/backend/cmd/monitord/server"
	"strconv"
	"syscall"
	"time"

	logging "github.com/ipfs/go-log/v2"
	"go.uber.org/zap"
)

func main() {
	var log = logging.Logger("monitord")
	sitesCSV := flag.String("sites", "~/sites.csv", "CSV file with mandatory header hostname and optional headers musthave.")
	scanPeriod := flag.Duration("scan-period", time.Duration(10*time.Minute), "Site scanning periodicity.")
	peerTimeout := flag.Duration("peer-timeout", time.Duration(45*time.Second), "Timeout to consider the peer to be offline.")
	numPings := flag.Int("num-pings", 5, "Number of pings per site to calculate average TTR.")
	portHTTP := flag.Int("http.port", 5002, "Port to run the server on.")
	portP2P := flag.Int("p2p.port", 50002, "Port to run the p2p node on.")
	templateFile := flag.String("html-template", "/template.html", "Path of the html template file.")
	flag.Parse()
	if *peerTimeout > *scanPeriod {
		panic(fmt.Errorf("scan-period less than site-timeout"))
	}

	lvl, err := logging.LevelFromString("info")
	if err != nil {
		panic(err)
	}

	logging.SetAllLoggers(lvl)

	srv, err := server.NewServer(*portHTTP, *portP2P, log.Desugar(), *sitesCSV)
	if err != nil {
		panic(err)
	}
	log.Desugar().Info("server successfully created.", zap.String("server addr:", "127.0.0.1:"+strconv.Itoa(*portHTTP)))
	srv.Start(*numPings, *scanPeriod, *peerTimeout, *templateFile)
	sigs := make(chan os.Signal, 1)

	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)

	done := make(chan bool, 1)

	go func() {
		<-sigs
		log.Desugar().Info("Signal captured, shutting down gracefully...")
		done <- true
	}()
	<-done
	srv.Stop()
	log.Desugar().Info("Exited normally")
}
