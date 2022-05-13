package daemon

import (
	"context"
	"mintter/backend/config"
	"mintter/backend/core"
	"mintter/backend/daemon/api"
	"mintter/backend/daemon/ondisk"
	"mintter/backend/mttnet"
	"mintter/backend/pkg/future"
	"mintter/backend/vcs"
	"net"

	"go.uber.org/fx"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

type grpcServer struct {
	grpc  *grpc.Server
	lis   net.Listener
	ready chan struct{}
}

func provideGRPCServer(lc fx.Lifecycle, stop fx.Shutdowner, cfg config.Config) (*grpcServer, *grpc.Server, error) {
	srv := &grpcServer{
		grpc:  grpc.NewServer(),
		ready: make(chan struct{}),
	}

	errc := make(chan error, 1)
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			var netc net.ListenConfig
			lis, err := netc.Listen(ctx, "tcp", ":"+cfg.GRPCPort)
			if err != nil {
				return err
			}
			srv.lis = lis

			go func() {
				close(srv.ready)
				err := srv.grpc.Serve(lis)
				if err != nil {
					if err := stop.Shutdown(); err != nil {
						panic(err)
					}
				}
				errc <- err
			}()

			return nil
		},
		OnStop: func(context.Context) error {
			srv.grpc.GracefulStop()
			return <-errc
		},
	})

	return srv, srv.grpc, nil
}

func registerGRPC(
	srv *grpc.Server,
	id *future.ReadOnly[core.Identity],
	repo *ondisk.OnDisk,
	v *vcs.SQLite,
	node *future.ReadOnly[*mttnet.Node],
) {
	svc := api.New(id, repo, v, node)
	svc.Register(srv)

	reflection.Register(srv)
}
