package lndclient

import (
	"context"
	"fmt"
	"reflect"
	"strings"
)

var (
	// supportedSubservers is a map of all RPC (sub)server names that are
	// supported by the lndclient library and their implementing interface
	// type. We use reflection to look up the methods implemented on those
	// interfaces to find out which permissions are needed for them.
	supportedSubservers = map[string]interface{}{
		"lnrpc":       (*LightningClient)(nil),
		"chainrpc":    (*ChainNotifierClient)(nil),
		"invoicesrpc": (*InvoicesClient)(nil),
		"routerrpc":   (*RouterClient)(nil),
		"signrpc":     (*SignerClient)(nil),
		"verrpc":      (*VersionerClient)(nil),
		"walletrpc":   (*WalletKitClient)(nil),
	}

	// renames is a map of renamed RPC method names. The key is the name as
	// implemented in lndclient and the value is the original name of the
	// RPC method defined in the proto.
	renames = map[string]string{
		"ChannelBackup":          "ExportChannelBackup",
		"ChannelBackups":         "ExportAllChannelBackups",
		"ConfirmedWalletBalance": "WalletBalance",
		"Connect":                "ConnectPeer",
		"DecodePaymentRequest":   "DecodePayReq",
		"EstimateFeeToP2WSH":     "EstimateFee",
		"ListTransactions":       "GetTransactions",
		"PayInvoice":             "SendPaymentSync",
		"UpdateChanPolicy":       "UpdateChannelPolicy",
		"NetworkInfo":            "GetNetworkInfo",
		"SubscribeGraph":         "SubscribeChannelGraph",
	}
)

// MacaroonRecipe returns a list of macaroon permissions that is required to use
// the full feature set of the given list of RPC package names.
func MacaroonRecipe(c LightningClient, packages []string) ([]MacaroonPermission,
	error) {

	// Get the full map of RPC URIs and the required permissions from the
	// backing lnd instance.
	allPermissions, err := c.ListPermissions(context.Background())
	if err != nil {
		return nil, err
	}

	uniquePermissions := make(map[string]map[string]struct{})
	for _, pkg := range packages {
		// Get the typed pointer from our map of supported interfaces.
		ifacePtr, ok := supportedSubservers[pkg]
		if !ok {
			return nil, fmt.Errorf("unknown subserver %s", pkg)
		}

		// From the pointer type we can find out the interface, its name
		// and what methods it declares.
		ifaceType := reflect.TypeOf(ifacePtr).Elem()
		serverName := strings.ReplaceAll(ifaceType.Name(), "Client", "")
		for i := 0; i < ifaceType.NumMethod(); i++ {
			// The methods in lndclient might be called slightly
			// differently. Rename according to our rename mapping
			// table.
			methodName := ifaceType.Method(i).Name
			rename, ok := renames[methodName]
			if ok {
				methodName = rename
			}

			// The full RPC URI is /package.Service/MethodName.
			rpcURI := fmt.Sprintf(
				"/%s.%s/%s", pkg, serverName, methodName,
			)

			requiredPermissions, ok := allPermissions[rpcURI]
			if !ok {
				return nil, fmt.Errorf("URI %s not found in "+
					"permission list", rpcURI)
			}

			// Add these permissions to the map we use to
			// de-duplicate the values.
			for _, perm := range requiredPermissions {
				actions, ok := uniquePermissions[perm.Entity]
				if !ok {
					actions = make(map[string]struct{})
					uniquePermissions[perm.Entity] = actions
				}
				actions[perm.Action] = struct{}{}
			}
		}
	}

	// Turn the de-duplicated map back into a slice of permission entries.
	var requiredPermissions []MacaroonPermission
	for entity, actions := range uniquePermissions {
		for action := range actions {
			requiredPermissions = append(
				requiredPermissions, MacaroonPermission{
					Entity: entity,
					Action: action,
				},
			)
		}
	}
	return requiredPermissions, nil
}
