package main

import (
	"encoding/csv"
	"flag"
	"fmt"
	"mintter/backend/cmd/monitord/server"
	"os"
	"os/signal"
	"strings"
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
	portHTTP := flag.Int("http-port", 5002, "Port to run the server on.")
	portP2P := flag.Int("p2p-port", 50002, "Port to run the p2p node on.")
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

	f, err := os.Open(*sitesCSV)
	if err != nil {
		panic(fmt.Errorf("Unable to read sites file [%s]:%w ", *sitesCSV, err))
	}
	csvReader := csv.NewReader(f)
	records, err := csvReader.ReadAll()
	if err != nil {
		panic(fmt.Errorf("Unable to parse file as CSV for %s: %w", *sitesCSV, err))
	}

	sitesList := []string{}
	for idx, row := range records {
		if idx == 0 && strings.ToLower(strings.Replace(row[0], " ", "", -1)) != "hostname" {
			panic("First row First column of the CSV must be hostname")
		}
		if idx == 0 || row[0][0:1] == "#" {
			continue
		}

		sitesList = append(sitesList, strings.Replace(strings.Replace(row[0], " ", "", -1), ",", "", -1))
	}

	if len(sitesList) == 0 {
		panic(fmt.Errorf("You must provide at least 1 site in sites csv"))
	}
	srv, err := server.NewServer(*portHTTP, *portP2P, *numPings, *scanPeriod, *peerTimeout, *templateFile, log.Desugar(), sitesList...)
	if err != nil {
		panic(err)
	}
	log.Desugar().Info("server successfully created.", zap.Int("Sites to be monitored", len(sitesList)))
	sigs := make(chan os.Signal, 1)

	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)

	done := make(chan bool, 1)

	go func() {
		<-sigs
		log.Desugar().Info("Signal captured, shutting down gracefully...")
		done <- true
	}()
	<-done
	srv.Shutdown()
	log.Desugar().Info("Exited normally")
}
