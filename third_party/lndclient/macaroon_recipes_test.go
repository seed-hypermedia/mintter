package lndclient_test

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"testing"

	"github.com/lightninglabs/lndclient"
	"github.com/stretchr/testify/require"
)

var (
	expectedPermissions = map[string]int{
		"lnrpc":       9,
		"chainrpc":    1,
		"invoicesrpc": 2,
		"routerrpc":   2,
		"signrpc":     2,
		"verrpc":      1,
		"walletrpc":   3,
	}
)

type permissionJSONData struct {
	Permissions map[string]struct {
		Permissions []struct {
			Entity string `json:"entity"`
			Action string `json:"action"`
		} `json:"permissions"`
	} `json:"method_permissions"`
}

type lightningMock struct {
	lndclient.LightningClient

	mockPermissions map[string][]lndclient.MacaroonPermission
}

func (m *lightningMock) ListPermissions(
	_ context.Context) (map[string][]lndclient.MacaroonPermission, error) {

	return m.mockPermissions, nil
}

// TestMacaroonRecipe makes sure the macaroon recipe for all supported packages
// can be generated.
func TestMacaroonRecipe(t *testing.T) {
	// Load our static permissions exported from lnd by calling
	// `lncli listpermissions > permissions.json`.
	content, err := ioutil.ReadFile("testdata/permissions.json")
	require.NoError(t, err)

	data := &permissionJSONData{}
	err = json.Unmarshal(content, data)
	require.NoError(t, err)

	mockPermissions := make(map[string][]lndclient.MacaroonPermission)
	for uri, perms := range data.Permissions {
		mockPermissions[uri] = make(
			[]lndclient.MacaroonPermission, len(perms.Permissions),
		)
		for idx, perm := range perms.Permissions {
			mockPermissions[uri][idx] = lndclient.MacaroonPermission{
				Entity: perm.Entity,
				Action: perm.Action,
			}
		}
	}
	clientMock := &lightningMock{
		mockPermissions: mockPermissions,
	}

	// Run the test for all supported RPC packages.
	for pkg, numPermissions := range expectedPermissions {
		pkg, numPermissions := pkg, numPermissions
		t.Run(pkg, func(t *testing.T) {
			t.Parallel()

			requiredPermissions, err := lndclient.MacaroonRecipe(
				clientMock, []string{pkg},
			)
			require.NoError(t, err)
			require.Len(t, requiredPermissions, numPermissions)
		})
	}
}
