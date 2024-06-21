// Package server is the serve to monitor site status.
package server

import (
	"context"
	"encoding/csv"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"reflect"
	"sort"
	"strconv"
	"strings"
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
	mu            sync.Mutex
	node          host.Host
	numPings      int
	ticker        *time.Ticker
	chScan        chan bool
	log           *zap.Logger
	httpServer    *http.Server
	templateFile  string
	sitesCSV      string
}

type siteStatus struct {
	StatusDNS    string
	LastDNSError string
	LastCheck    string
	StatusP2P    string
	LastP2PError string
}

// NewServer returns a new monitor server. It also starts serving content on the provided port.
func NewServer(portHTTP int, portP2P int, log *zap.Logger, sitesCSVPath string) (*Srv, error) {
	portStr := strconv.Itoa(portP2P)
	node, err := libp2p.New(
		libp2p.ListenAddrStrings([]string{
			"/ip4/0.0.0.0/tcp/" + portStr,
			"/ip4/0.0.0.0/udp/" + portStr + "/quic-v1"}...),
	)
	if err != nil {
		return nil, err
	}

	monitorStatus := make(map[string]*siteStatus)
	srv := &Srv{
		MonitorStatus: &monitorStatus,
		node:          node,
		log:           log,
		sitesCSV:      sitesCSVPath,
	}
	if err := srv.updateSiteList(); err != nil {
		return nil, err
	}

	srv.httpServer = &http.Server{
		Addr:              "0.0.0.0:" + strconv.Itoa(portHTTP),
		ReadHeaderTimeout: 3 * time.Second,
		Handler:           srv,
	}

	return srv, nil
}

// Start starts the monitor.
func (s *Srv) Start(numPings int, scanPeriod time.Duration, peerTimeout time.Duration, templateFile string) {
	s.ticker = time.NewTicker(scanPeriod)
	s.numPings = numPings
	s.templateFile = templateFile
	go s.httpServer.ListenAndServe()

	go s.scan(peerTimeout)
}

// Stop closes the server and p2p node inside.
func (s *Srv) Stop() {
	s.ticker.Stop()
	s.chScan <- true
	_ = s.httpServer.Shutdown(context.Background())
	s.node.Close()
}

func (s *Srv) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.log.Debug("http Request", zap.String("template file", s.templateFile), zap.Any("data", s.MonitorStatus))
	tmpl, _ := template.ParseFiles(s.templateFile)
	err := tmpl.Execute(w, *s.MonitorStatus)
	if err != nil {
		s.log.Error("Error rendering page", zap.String("template file", s.templateFile), zap.Any("data", s.MonitorStatus), zap.Error(err))
	}
}

func (s *Srv) updateSiteList() error {
	f, err := os.Open(s.sitesCSV)
	if err != nil {
		return fmt.Errorf("Unable to read sites file [%s]:%w ", s.sitesCSV, err)
	}
	defer f.Close()
	csvReader := csv.NewReader(f)
	records, err := csvReader.ReadAll()
	if err != nil {
		return fmt.Errorf("Unable to parse sites reader as CSV for: %w", err)
	}

	newSitesList := []string{}
	for idx, row := range records {
		if idx == 0 && strings.ToLower(strings.Replace(row[0], " ", "", -1)) != "hostname" {
			return fmt.Errorf("First row First column of the CSV must be hostname")
		}
		if idx == 0 || row[0][0:1] == "#" {
			continue
		}

		newSitesList = append(newSitesList, strings.Replace(strings.Replace(row[0], " ", "", -1), ",", "", -1))
	}
	sort.Strings(newSitesList)
	s.mu.Lock()
	defer s.mu.Unlock()
	currentSiteList := make([]string, len(*s.MonitorStatus))
	i := 0
	for k := range *s.MonitorStatus {
		currentSiteList[i] = k
		i++
	}

	sort.Strings(currentSiteList)
	if !reflect.DeepEqual(currentSiteList, newSitesList) {
		newMonitorStatus := make(map[string]*siteStatus)
		for _, site := range newSitesList {
			if _, ok := (*s.MonitorStatus)[site]; !ok {
				newMonitorStatus[site] = &siteStatus{
					StatusDNS: "N/A",
					StatusP2P: "N/A",
				}
			} else {
				newMonitorStatus[site] = (*s.MonitorStatus)[site]
			}
		}
		s.MonitorStatus = &newMonitorStatus
		s.log.Info("Updated Site list", zap.Int("Sites to monitor", len(newSitesList)))
	}
	return nil
}
func (s *Srv) scan(timeout time.Duration) {
	s.chScan = make(chan bool)
	for {
		select {
		case <-s.chScan:
			return
		case <-s.ticker.C:
			if err := s.updateSiteList(); err != nil {
				s.log.Warn("Failed to update site list from CSV", zap.Error(err))
			}
			var wg sync.WaitGroup
			for site, stat := range *s.MonitorStatus {
				wg.Add(1)
				go func(site string, stat *siteStatus) {
					var err error
					ctx, cancel := context.WithTimeout(context.Background(), timeout)
					defer wg.Done()
					defer cancel()
					stat.LastCheck = time.Now().UTC().Format("2006-01-02 15:04:05")
					info, err := s.checkSeedAddrs(ctx, site, "")

					if err != nil {
						checkError := fmt.Errorf("Could not get site [%s] address from seed-well-known: %w", site, err)
						stat.StatusDNS = err.Error()
						stat.StatusP2P = "N/A"
						stat.LastDNSError = time.Now().UTC().Format("2006-01-02 15:04:05") + " " + err.Error()
						s.log.Warn("CheckSeedAddrs error", zap.Error(checkError))
						return
					}
					stat.StatusDNS = "OK"
					duration, err := s.checkP2P(ctx, info, s.numPings)
					if err != nil {
						checkError := fmt.Errorf("P2P error [%s]: %w", site, err)
						stat.StatusP2P = "KO"
						stat.LastP2PError = time.Now().UTC().Format("2006-01-02 15:04:05") + " " + err.Error()
						s.log.Warn("CheckP2P error", zap.Error(checkError))
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
