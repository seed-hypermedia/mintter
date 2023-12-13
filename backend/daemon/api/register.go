package api

import (
	accounts "mintter/backend/genproto/accounts/v1alpha"
	daemon "mintter/backend/genproto/daemon/v1alpha"
	documents "mintter/backend/genproto/documents/v1alpha"
	entities "mintter/backend/genproto/entities/v1alpha"
	groups "mintter/backend/genproto/groups/v1alpha"
	networking "mintter/backend/genproto/networking/v1alpha"

	"google.golang.org/grpc"
)

// Register API services on the given gRPC server.
func (s Server) Register(srv *grpc.Server) {
	accounts.RegisterAccountsServer(srv, s.Accounts)
	daemon.RegisterDaemonServer(srv, s.Daemon)

	documents.RegisterContentGraphServer(srv, s.Documents)
	documents.RegisterDraftsServer(srv, s.Documents)
	documents.RegisterPublicationsServer(srv, s.Documents)
	documents.RegisterChangesServer(srv, s.Documents)
	documents.RegisterCommentsServer(srv, s.Documents)

	networking.RegisterNetworkingServer(srv, s.Networking)
	entities.RegisterEntitiesServer(srv, s.Entities)
	groups.RegisterGroupsServer(srv, s.Groups)
}
