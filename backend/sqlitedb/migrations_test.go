package sqlitedb

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMigrate(t *testing.T) {
	s := NewStore(makeDB(t))
	require.NoError(t, s.migrate(context.Background(), migrations))
	require.Error(t, s.migrate(context.Background(), nil), "must refuse to rollback migrations")
}
