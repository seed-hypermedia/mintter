package lightning

import (
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/lightningnetwork/lnd/macaroons"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	macaroon "gopkg.in/macaroon.v2"

	"mintter/backend/config"
)

const (
	defaultTLSCertFilename   = "tls.cert"
	defaultMacaroonFilename  = "admin.macaroon"
	currentAdminMacaroonSize = 252
)

var (
	// maxMsgRecvSize is the largest message our client will receive. We
	// set this to ~50Mb atm.
	maxMsgRecvSize = grpc.MaxCallRecvMsgSize(1 * 1024 * 1024 * 50)
)

func checkMacaroons(cfg *config.LND) {
	mDir := path.Join(cfg.LndDir, "data", "chain", "bitcoin", cfg.Network)
	fi, err := os.Stat(path.Join(mDir, defaultMacaroonFilename))
	if err != nil {
		return
	}
	if fi.Size() < currentAdminMacaroonSize {
		os.Remove(path.Join(mDir, defaultMacaroonFilename))
		os.Remove(path.Join(mDir, "invoice.macaroon"))
		os.Remove(path.Join(mDir, "readonly.macaroon"))
	}
}

// NewLightningClient returns an instance of lnrpc.LightningClient
func newLightningClient(cfg *config.LND) (*grpc.ClientConn, error) {
	return newLightningConnection(cfg)
}

func NewClientConnection(cfg *config.LND) (*grpc.ClientConn, error) {
	return newLightningConnection(cfg)
}

func newLightningConnection(cfg *config.LND) (*grpc.ClientConn, error) {
	appWorkingDir := cfg.LndDir
	network := cfg.Network
	macaroonDir := strings.Join([]string{appWorkingDir, "data", "chain", "bitcoin", network}, "/")
	tlsCertPath := filepath.Join(appWorkingDir, defaultTLSCertFilename)
	creds, err := credentials.NewClientTLSFromFile(tlsCertPath, "")
	if err != nil {
		return nil, err
	}

	// Create a dial options array.
	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(creds),
		grpc.WithDefaultCallOptions(maxMsgRecvSize),
	}

	macPath := filepath.Join(macaroonDir, defaultMacaroonFilename)
	macBytes, err := ioutil.ReadFile(macPath)
	if err != nil {
		return nil, err
	}
	mac := &macaroon.Macaroon{}
	if err = mac.UnmarshalBinary(macBytes); err != nil {
		return nil, err
	}

	// Now we append the macaroon credentials to the dial options.
	cred := macaroons.NewMacaroonCredential(mac)
	opts = append(opts, grpc.WithPerRPCCredentials(cred))

	/*
		conn, err := lnd.MemDial()
		if err != nil {
			return nil, err
		}

		// We need to use a custom dialer so we can also connect to unix sockets
		// and not just TCP addresses.
		opts = append(
			opts, grpc.WithDialer(func(target string,
				timeout time.Duration) (net.Conn, error) {
				return conn, nil
			}),
		)
	*/
	grpcCon, err := grpc.Dial("localhost", opts...)
	if err != nil {
		return nil, err
	}

	return grpcCon, nil
}
