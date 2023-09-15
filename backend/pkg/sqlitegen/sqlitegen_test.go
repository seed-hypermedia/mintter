package sqlitegen

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestGoNameFromSQLName(t *testing.T) {
	tests := []struct {
		In         string
		Exported   string
		Unexported string
	}{
		{
			In:         "wallets.id",
			Exported:   "WalletsID",
			Unexported: "walletsID",
		},
		{
			In:         "long_table_name.long_column_id",
			Exported:   "LongTableNameLongColumnID",
			Unexported: "longTableNameLongColumnID",
		},
		{
			In:         "http_requests_table.http_request_column",
			Exported:   "HTTPRequestsTableHTTPRequestColumn",
			Unexported: "httpRequestsTableHTTPRequestColumn",
		},
	}

	for _, tt := range tests {
		t.Run(tt.In, func(t *testing.T) {
			require.Equal(t, tt.Exported, GoNameFromSQLName(tt.In, true))
			require.Equal(t, tt.Unexported, GoNameFromSQLName(tt.In, false))
		})
	}
}
