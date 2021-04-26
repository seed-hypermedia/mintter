package backend

import (
	"context"
	"fmt"
	accounts "mintter/api/go/accounts/v1alpha"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestGetAccount_Own(t *testing.T) {
	ctx := context.Background()
	alice := makeTestBackendServer(t, "alice", true)

	acc, err := alice.backend.accounts.GetAccount(ctx, &accounts.GetAccountRequest{})
	require.NoError(t, err)
	fmt.Printf("%+v\n", acc)
}
