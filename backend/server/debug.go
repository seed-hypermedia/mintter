package server

import (
	"encoding/json"
	"net/http"
)

func (s *Server) DebugHandler() http.Handler {
	type debugPeer struct {
		PeerID           string
		ProfileID        string
		Addrs            []string
		ConnectionStatus string
	}

	type debugResponse struct {
		Peers []debugPeer
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := s.checkReady(); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		ps := s.node.Store().Peerstore()
		h := s.node.Host()
		store := s.node.Store()

		pids := ps.Peers()

		resp := debugResponse{
			Peers: make([]debugPeer, len(pids)),
		}

		for i, pid := range pids {
			resp.Peers[i].PeerID = pid.String()
			resp.Peers[i].Addrs = addrSlice(ps.Addrs(pid)...)

			profID, err := store.GetProfileForPeer(r.Context(), pid)
			if err == nil {
				resp.Peers[i].ProfileID = profID.String()
			}

			resp.Peers[i].ConnectionStatus = h.Network().Connectedness(pid).String()
		}

		enc := json.NewEncoder(w)
		enc.SetIndent("", "  ")
		if err := enc.Encode(resp); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	})
}
