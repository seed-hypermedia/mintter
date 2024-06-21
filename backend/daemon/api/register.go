package api

import (
	accounts "seed/backend/genproto/accounts/v1alpha"
	activity "seed/backend/genproto/activity/v1alpha"
	daemon "seed/backend/genproto/daemon/v1alpha"
	documents "seed/backend/genproto/documents/v1alpha"
	entities "seed/backend/genproto/entities/v1alpha"
	networking "seed/backend/genproto/networking/v1alpha"

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
	documents.RegisterMergeServer(srv, s.Documents)

	activity.RegisterActivityFeedServer(srv, s.Activity)
	networking.RegisterNetworkingServer(srv, s.Networking)
	entities.RegisterEntitiesServer(srv, s.Entities)
}
