package mttdoc

import (
	"testing"

	"github.com/sanity-io/litter"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

func TestDiff(t *testing.T) {
	t.SkipNow()

	a := &doc{}
	err := parseAST(gjson.Parse(docA), a, a.list())
	require.NoError(t, err)

	b := &doc{}
	err = parseAST(gjson.Parse(docB), b, a.list())
	require.NoError(t, err)

	litter.Dump(a)

	res := diff(a, b)

	litter.Dump(res)
}
