// Package server is the serve to monitor site status.
package server

import (
	"context"
	"fmt"
	"io"
	documents "mintter/backend/genproto/documents/v1alpha"
	"net/http"
	"time"

	"mintter/backend/mttnet"

	"github.com/libp2p/go-libp2p/core/peer"
	peerstore "github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/p2p/net/swarm"
	"google.golang.org/protobuf/encoding/protojson"
)

func (s *Srv) checkP2P(ctx context.Context, peer peer.AddrInfo, numPings int) (time.Duration, error) {
	var pingAvg time.Duration
	{
		sw, ok := s.node.Network().(*swarm.Swarm)
		if ok {
			sw.Backoff().Clear(peer.ID)
		}
	}
	if err := s.node.Connect(ctx, peer); err != nil {
		return pingAvg, fmt.Errorf("Could not connect: %w", err)
	}

	ch := s.pingService.Ping(ctx, peer.ID)
	for i := 0; i < numPings; i++ {
		res := <-ch
		pingAvg += res.RTT
		if res.Error != nil {
			return pingAvg, fmt.Errorf("Could not ping: %w", res.Error)
		}
	}
	pingAvg = time.Duration((pingAvg.Nanoseconds()) / int64(numPings))
	return pingAvg, nil
}

func (s *Srv) checkMintterAddrs(ctx context.Context, hostname, mustInclude string) (info peerstore.AddrInfo, err error) {
	resp, err := s.getSiteInfoHTTP(hostname)
	if err != nil {
		return
	}
	info, err = mttnet.AddrInfoFromStrings(resp.Addresses...)
	if err != nil {
		return
	}

	return
}

func (s *Srv) getSiteInfoHTTP(SiteHostname string) (*documents.SiteDiscoveryConfig, error) {
	requestURL := fmt.Sprintf("%s/%s", SiteHostname, mttnet.WellKnownPath)

	req, err := http.NewRequest(http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("could not create request to well-known site: %w ", err)
	}

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("could not contact to provided site [%s]: %w ", requestURL, err)
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode > 299 {
		return nil, fmt.Errorf("site info url [%s] not working. Status code: %d", requestURL, res.StatusCode)
	}

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read json body: %w", err)
	}

	var resp documents.SiteDiscoveryConfig

	if err := protojson.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON body: %w", err)
	}
	return &resp, nil
}
