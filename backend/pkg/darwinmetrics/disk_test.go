//go:build darwin
// +build darwin

package darwinmetrics

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDiskMetrics(t *testing.T) {
	pid := os.Getpid()
	metrics, err := getDiskMetrics(pid)
	require.NoError(t, err)
	require.Equal(t, 0, int(metrics.read_bytes))
	require.Equal(t, 0, int(metrics.write_bytes))
}

func BenchmarkTestDiskMetrics(b *testing.B) {
	pid := os.Getpid()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := getDiskMetrics(pid)
		if err != nil {
			b.Fatal(err)
		}
	}
}
