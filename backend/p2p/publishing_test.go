package p2p_test

import (
	"context"
	"fmt"
	"mintter/backend/publishing"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestPublishing(t *testing.T) {
	alice := makeTestNode(t, "alice")
	bob := makeTestNode(t, "bob")
	ctx := context.Background()

	s1 := publishing.Section{
		DocumentID: "bob-doc-1",
		Author:     bob.Account().ID.String(),
		Body:       "Hello! This is Bob!",
	}

	sects, err := bob.AddSections(ctx, s1)
	require.NoError(t, err)

	pub1 := publishing.Publication{
		DocumentID: "bob-doc-1",
		Title:      "Hello world",
		Author:     bob.Account().ID.String(),
		Sections:   sects,
	}

	pubcid, err := bob.AddPublication(ctx, pub1)
	require.NoError(t, err)

	connectPeers(t, ctx, bob, alice)

	pub, err := alice.GetPublication(ctx, pubcid)
	require.NoError(t, err)
	require.Equal(t, pub1, pub)
}

func TestSyncPublications(t *testing.T) {
	alice := makeTestNode(t, "alice")
	bob := makeTestNode(t, "bob")
	ctx := context.Background()

	s1 := publishing.Section{
		DocumentID: "bob-doc-1",
		Author:     bob.Account().ID.String(),
		Body:       "Hello! This is Bob!",
	}

	connectPeers(t, ctx, bob, alice)

	sects, err := bob.AddSections(ctx, s1)
	require.NoError(t, err)

	pub1 := publishing.Publication{
		DocumentID: "bob-doc-1",
		Title:      "Hello world",
		Author:     bob.Account().ID.String(),
		Sections:   sects,
	}

	pubcid, err := bob.AddPublication(ctx, pub1)
	require.NoError(t, err)

	require.NoError(t, alice.SyncPublications(ctx, bob.Account().ID))

	cids, err := alice.Store().ListPublications("", 0, 0)
	require.NoError(t, err)
	require.Len(t, cids, 1)
	require.Equal(t, pubcid, cids[0])

	s2 := publishing.Section{
		DocumentID: "alice-doc-1",
		Author:     alice.Account().ID.String(),
		Body:       "Hello! This is Alice!",
	}

	sects2, err := alice.AddSections(ctx, s2)
	require.NoError(t, err)

	pub2 := publishing.Publication{
		DocumentID: "alice-doc-1",
		Title:      "Hello World",
		Author:     alice.Account().ID.String(),
		Sections:   sects2,
	}

	pubcid2, err := alice.AddPublication(ctx, pub2)
	require.NoError(t, err)

	require.Eventually(t, func() bool {
		aliceInBob, err := bob.Store().ListPublications(alice.Account().ID.String(), 0, 0)
		if err != nil {
			fmt.Println(err)
			return false
		}
		if len(aliceInBob) != 1 {
			fmt.Println("not one")
			return false
		}

		return aliceInBob[0] == pubcid2
	}, 3*time.Second, 500*time.Millisecond, "bob must sync alice's new publication via pubsub")
}
