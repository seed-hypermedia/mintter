package backend

import (
	"testing"

	accounts "mintter/backend/api/accounts/v1alpha"
	"mintter/backend/testutil"

	"github.com/stretchr/testify/require"
)

func TestDiffProto_EmptyOld(t *testing.T) {
	old := &accounts.Profile{}
	target := &accounts.Profile{
		Alias: "fake-alias",
	}

	diff := diffProto(old, target).(*accounts.Profile)
	testutil.ProtoEqual(t, target, diff, "must produce diff against empty message")
}

func TestDiffProto_EmptyNew(t *testing.T) {
	old := &accounts.Profile{
		Alias: "fake-alias",
	}
	target := &accounts.Profile{}
	require.Nil(t, diffProto(old, target))
}

func TestDiffProto_Mixed(t *testing.T) {
	old := &accounts.Profile{
		Alias: "fake-alias",
		Bio:   "unchanged-bio",
	}
	updated := &accounts.Profile{
		Alias: "new-alias",
		Bio:   "unchanged-bio",
		Email: "foo@example.com",
	}

	want := &accounts.Profile{
		Alias: "new-alias",
		Bio:   "",
		Email: "foo@example.com",
	}

	diff := diffProto(old, updated).(*accounts.Profile)
	testutil.ProtoEqual(t, want, diff, "diff failed")
}
