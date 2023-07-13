// Package server is the serve to monitor site status.
package server

import (
	"context"
	"fmt"
	"html/template"
	"net/http"
	"strconv"
	"time"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/p2p/protocol/ping"
	"go.uber.org/zap"
)

// Srv is the server type.
type Srv struct {
	// MonitorStatus is a map where the key is the site hostname and the value the status.
	MonitorStatus *map[string]*siteStatus
	node          host.Host
	pingService   *ping.PingService
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
func NewServer(portHTTP int, portP2P int, numPings int, scanPeriod time.Duration, peerTimeout time.Duration, templateFile string, log *zap.Logger, sites ...string) (*Srv, error) {
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
		pingService:   ping.NewPingService(node),
	}

	srv.httpServer = &http.Server{
		Addr:              ":" + strconv.Itoa(portHTTP),
		ReadHeaderTimeout: 3 * time.Second,
		Handler:           srv,
	}

	go srv.httpServer.ListenAndServe()

	go srv.scan(peerTimeout)
	return srv, nil
}

// Shutdown closes the server and p2p node inside.
func (s *Srv) Shutdown() {
	s.ticker.Stop()
	s.chScan <- true
	_ = s.httpServer.Shutdown(context.Background())
	s.node.Close()
}

func (s *Srv) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.log.Info("http Request", zap.String("template file", s.templateFile), zap.Any("data", s.MonitorStatus))
	tmpl, _ := template.ParseFiles(s.templateFile)
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
			for site, stat := range *s.MonitorStatus {
				ctx, cancel := context.WithTimeout(context.Background(), timeout)
				var err error
				stat.LastCheck = time.Now().UTC().Format("2006-01-02 15:04:05")
				info, err := s.checkMintterAddrs(ctx, site, "")

				if err != nil {
					checkError := fmt.Errorf("Could not get site [%s] address from mintter-well-known: %w", site, err)
					stat.StatusDNS = err.Error()
					stat.StatusP2P = "N/A"
					stat.LastDNSError = time.Now().UTC().Format("2006-01-02 15:04:05") + " " + err.Error()
					s.log.Warn("CheckMintterAddrs error", zap.Error(checkError))
					cancel()
					continue
				}
				stat.StatusDNS = "OK"
				duration, err := s.checkP2P(ctx, info, s.numPings)
				if err != nil {
					checkError := fmt.Errorf("P2P error [%s]: %w", site, err)
					stat.StatusP2P = "KO"
					stat.LastP2PError = time.Now().UTC().Format("2006-01-02 15:04:05") + " " + err.Error()
					s.log.Warn("CheckP2P error", zap.Error(checkError))
					cancel()
					continue
				}
				stat.StatusP2P = "OK Avg. Ping:" + duration.Round(time.Millisecond).String()
				cancel()
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
			}

		}
	}
}
