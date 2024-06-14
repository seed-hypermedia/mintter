package qb

import (
	"fmt"
	"seed/backend/pkg/sqlitegen"
	"testing"
)

func ExampleTemplate() {
	tc := &Templates{}

	q := tc.SQL(`SELECT {{t "users.name"}} FROM {{t "users"}}`, sqlitegen.Table("users"), sqlitegen.Column("users.name"))
	fmt.Println(q)
	// Output: SELECT users.name FROM users
}

func BenchmarkTemplate(b *testing.B) {
	tc := &Templates{}

	var str string
	for n := 0; n < b.N; n++ {
		str = doQuery(tc)
	}
	_ = str
}

//go:noinline
func doQuery(tc *Templates) string {
	return tc.SQL(`SELECT * FROM {{ t "my_table" }}`, sqlitegen.Table("my_table"))
}
