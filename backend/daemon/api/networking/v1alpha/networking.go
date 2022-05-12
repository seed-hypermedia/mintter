package networking

import "mintter/backend/mttnet"

type Server struct {
	net *mttnet.Node
}

func NewServer(node *mttnet.Node) *Server {
	return &Server{
		net: node,
	}
}
