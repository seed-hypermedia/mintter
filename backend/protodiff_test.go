package backend

import (
	"testing"

	accounts "mintter/backend/api/accounts/v1alpha"
	"mintter/backend/testutil"

	"github.com/stretchr/testify/require"
)

func TestDiffProto_EmptyOld(t *testing.T) {
	old := &accounts.Profile{}
	new := &accounts.Profile{
		Alias: "fake-alias",
	}

	diff := diffProto(old, new).(*accounts.Profile)
	testutil.ProtoEqual(t, new, diff, "must produce diff against empty message")
}

func TestDiffProto_EmptyNew(t *testing.T) {
	old := &accounts.Profile{
		Alias: "fake-alias",
	}
	new := &accounts.Profile{}
	require.Nil(t, diffProto(old, new))
}

func TestDiffProto_Mixed(t *testing.T) {
	old := &accounts.Profile{
		Alias: "fake-alias",
		Bio:   "unchanged-bio",
	}
	new := &accounts.Profile{
		Alias: "new-alias",
		Bio:   "unchanged-bio",
		Email: "foo@example.com",
	}

	want := &accounts.Profile{
		Alias: "new-alias",
		Bio:   "",
		Email: "foo@example.com",
	}

	diff := diffProto(old, new).(*accounts.Profile)
	testutil.ProtoEqual(t, want, diff, "diff failed")
}
