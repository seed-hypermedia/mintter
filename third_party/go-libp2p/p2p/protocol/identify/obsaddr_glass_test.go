package identify

// This test lives in the identify package, not the identify_test package, so it
// can access internal types.

import (
	"testing"

	ma "github.com/multiformats/go-multiaddr"
	"github.com/stretchr/testify/require"
)

func TestObservedAddrGroupKey(t *testing.T) {
	oa1 := &observedAddr{addr: ma.StringCast("/ip4/1.2.3.4/tcp/2345")}
	oa2 := &observedAddr{addr: ma.StringCast("/ip4/1.2.3.4/tcp/1231")}
	oa3 := &observedAddr{addr: ma.StringCast("/ip4/1.2.3.5/tcp/1231")}
	oa4 := &observedAddr{addr: ma.StringCast("/ip4/1.2.3.4/udp/1231")}
	oa5 := &observedAddr{addr: ma.StringCast("/ip4/1.2.3.4/udp/1531")}
	oa6 := &observedAddr{addr: ma.StringCast("/ip4/1.2.3.4/udp/1531/quic")}
	oa7 := &observedAddr{addr: ma.StringCast("/ip4/1.2.3.4/udp/1111/quic")}
	oa8 := &observedAddr{addr: ma.StringCast("/ip4/1.2.3.5/udp/1111/quic")}

	// different ports, same IP => same key
	require.Equal(t, oa1.groupKey(), oa2.groupKey())
	// different IPs => different key
	require.NotEqual(t, oa2.groupKey(), oa3.groupKey())
	// same port, different protos => different keys
	require.NotEqual(t, oa3.groupKey(), oa4.groupKey())
	// same port, same address, different protos => different keys
	require.NotEqual(t, oa2.groupKey(), oa4.groupKey())
	// udp works as well
	require.Equal(t, oa4.groupKey(), oa5.groupKey())
	// udp and quic are different
	require.NotEqual(t, oa5.groupKey(), oa6.groupKey())
	// quic works as well
	require.Equal(t, oa6.groupKey(), oa7.groupKey())
	require.NotEqual(t, oa7.groupKey(), oa8.groupKey())
}
