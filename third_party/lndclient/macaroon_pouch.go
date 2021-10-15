package lndclient

import (
	"context"
	"encoding/hex"
	"io/ioutil"
	"path/filepath"

	"google.golang.org/grpc/metadata"
)

var (
	// defaultMacaroonFileNames is the default list of macaroon file names
	// that lndclient will attempt to load if a macaroon directory is given
	// instead of a single custom macaroon.
	defaultMacaroonFileNames = []string{
		invoiceMacFilename,
		chainMacFilename,
		signerMacFilename,
		walletKitMacFilename,
		routerMacFilename,
		adminMacFilename,
		readonlyMacFilename,
	}
)

// loadMacaroon tries to load a macaroon file either from the default macaroon
// dir and the default filename or, if specified, from the custom macaroon path
// that overwrites the former two parameters.
func loadMacaroon(defaultMacDir, defaultMacFileName,
	customMacPath string) (serializedMacaroon, error) {

	// If a custom macaroon path is set, we ignore the macaroon dir and
	// default filename and always just load the custom macaroon, assuming
	// it contains all permissions needed to use the subservers.
	if customMacPath != "" {
		return newSerializedMacaroon(customMacPath)
	}

	return newSerializedMacaroon(filepath.Join(
		defaultMacDir, defaultMacFileName,
	))
}

// serializedMacaroon is a type that represents a hex-encoded macaroon. We'll
// use this primarily vs the raw binary format as the gRPC metadata feature
// requires that all keys and values be strings.
type serializedMacaroon string

// newSerializedMacaroon reads a new serializedMacaroon from that target
// macaroon path. If the file can't be found, then an error is returned.
func newSerializedMacaroon(macaroonPath string) (serializedMacaroon, error) {
	macBytes, err := ioutil.ReadFile(macaroonPath)
	if err != nil {
		return "", err
	}

	return serializedMacaroon(hex.EncodeToString(macBytes)), nil
}

// WithMacaroonAuth modifies the passed context to include the macaroon KV
// metadata of the target macaroon. This method can be used to add the macaroon
// at call time, rather than when the connection to the gRPC server is created.
func (s serializedMacaroon) WithMacaroonAuth(ctx context.Context) context.Context {
	return metadata.AppendToOutgoingContext(ctx, "macaroon", string(s))
}

// macaroonPouch holds the set of macaroons we need to interact with lnd for
// Loop. Each sub-server has its own macaroon, and for the remaining temporary
// calls that directly hit lnd, we'll use the admin macaroon.
type macaroonPouch map[string]serializedMacaroon

// newMacaroonPouch returns a new instance of a fully populated macaroonPouch
// given the directory where all the macaroons are stored.
func newMacaroonPouch(macaroonDir, customMacPath string) (macaroonPouch,
	error) {

	// If a custom macaroon is specified, we assume it contains all
	// permissions needed for the different subservers to function and we
	// use it for all of them.
	if customMacPath != "" {
		mac, err := loadMacaroon("", "", customMacPath)
		if err != nil {
			return nil, err
		}

		return macaroonPouch{
			invoiceMacFilename:   mac,
			chainMacFilename:     mac,
			signerMacFilename:    mac,
			walletKitMacFilename: mac,
			routerMacFilename:    mac,
			adminMacFilename:     mac,
			readonlyMacFilename:  mac,
		}, nil
	}

	var (
		m   = make(macaroonPouch)
		err error
	)

	for _, macFileName := range defaultMacaroonFileNames {
		m[macFileName], err = loadMacaroon(
			macaroonDir, macFileName, customMacPath,
		)
		if err != nil {
			return nil, err
		}
	}

	return m, nil
}
