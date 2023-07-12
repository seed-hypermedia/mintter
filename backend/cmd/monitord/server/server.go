// Package server is the serve to monitor site status.
package server

import (
	"context"
	"fmt"
	"html/template"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/host"
	"go.uber.org/zap"
)

// Srv is the server type.
type Srv struct {
	// MonitorStatus is a map where the key is the site hostname and the value the status.
	MonitorStatus *map[string]*siteStatus
	node          host.Host
	numPings      int
	ticker        *time.Ticker
	chScan        chan bool
	log           *zap.Logger
	httpServer    *http.Server
	templateFile  string
}

type siteStatus struct {
	StatusDNS    string
	LastDNSError string
	LastCheck    string
	StatusP2P    string
	LastP2PError string
}

// NewServer returns a new monitor server. It also starts serving content on the provided port.
func NewServer(portHTTP int, portP2P int, numPings int, scanPeriod time.Duration, siteTimeout time.Duration, templateFile string, log *zap.Logger, sites ...string) (*Srv, error) {
	node, err := libp2p.New(
		libp2p.ListenAddrStrings("/ip4/127.0.0.1/tcp/" + strconv.Itoa(portP2P)),
	)
	if err != nil {
		return nil, err
	}
	monitorStatus := make(map[string]*siteStatus)
	for _, site := range sites {
		monitorStatus[site] = &siteStatus{
			StatusDNS: "N/A",
			StatusP2P: "N/A",
		}
	}

	srv := &Srv{
		MonitorStatus: &monitorStatus,
		node:          node,
		ticker:        time.NewTicker(scanPeriod),
		numPings:      numPings,
		log:           log,
		templateFile:  templateFile,
	}

	srv.httpServer = &http.Server{
		Addr:              ":" + strconv.Itoa(portHTTP),
		ReadHeaderTimeout: 3 * time.Second,
		Handler:           srv,
	}

	go srv.httpServer.ListenAndServe()

	go srv.scan(siteTimeout)
	return srv, nil
}

// Shutdown closes the server and p2p node inside.
func (s *Srv) Shutdown() {
	_ = s.httpServer.Shutdown(context.Background())
	s.node.Close()
	s.ticker.Stop()
	s.chScan <- true
}

func (s *Srv) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.log.Info("http Request", zap.String("template file", s.templateFile), zap.Any("data", s.MonitorStatus))
	tmpl, _ := template.ParseFiles(s.templateFile)
	//TODO: Prettify
	/*
		for k, v := range *s.MonitorStatus{
			v.
		}
		.Format("yyyy-mm-dd HH:MM:SS")
	*/
	err := tmpl.Execute(w, *s.MonitorStatus)
	if err != nil {
		s.log.Error("Errorn rendering page", zap.String("template file", s.templateFile), zap.Any("data", s.MonitorStatus), zap.Error(err))
	}
}

func (s *Srv) scan(timeout time.Duration) {
	s.chScan = make(chan bool)
	for {
		select {
		case <-s.chScan:
			return
		case <-s.ticker.C:

			var wg sync.WaitGroup
			for site, stat := range *s.MonitorStatus {
				wg.Add(1)
				go func(site string, stat *siteStatus) {
					var err error
					defer s.log.Info("finished scanning", zap.String("Site", site), zap.Any("Data", stat), zap.Error(err))
					defer wg.Done()
					ctx, cancel := context.WithTimeout(context.Background(), timeout)
					defer cancel()

					info, err := s.checkMintterAddrs(ctx, site, "")
					now := time.Now().Format("2006-01-02 15:04:05")
					stat.LastCheck = now
					if err != nil {
						checkError := fmt.Errorf("Could not get site [%s] address from mintter-well-known: %w", site, err)
						stat.StatusDNS = err.Error()
						stat.StatusP2P = "N/A"
						stat.LastDNSError = now + " Err:" + err.Error()
						s.log.Warn("CheckMintterAddrs error", zap.Error(checkError))
						return
					}
					stat.StatusDNS = "OK"
					duration, err := s.checkP2P(ctx, info, s.numPings)
					if err != nil {
						checkError := fmt.Errorf("Could not ping site [%s]: %w", site, err)
						stat.StatusP2P = "KO"
						stat.LastP2PError = now + " Err:" + err.Error()
						s.log.Warn("checkP2P error", zap.Error(checkError))
						return
					}
					stat.StatusP2P = "OK Avg. Ping:" + duration.Round(time.Millisecond).String()
					/*
						if mustInclude != "" {
							for _, addr := range info.Addrs {
								if mustInclude == addr.String() {
									includedAddress = true
									break
								}
							}
							return includedAddress, nil
						}
					*/
				}(site, stat)
			}

			wg.Wait()
		}
	}
}
