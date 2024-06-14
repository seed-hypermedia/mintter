package qb

import (
	"html/template"
	"seed/backend/pkg/sqlitegen"
	"strings"
	"sync"
)

// Templates is a cache for SQL query templates to the resulting
// executed template output. It's useful to write mostly pure SQL queries,
// but with a bit of added type-safety.
type Templates struct {
	m sync.Map
}

// SQL compiles a SQL template and caches the result for efficiency.
// Inside the template users can use the `{{t}}` function to make sure
// only passed terms are used. This allows to make sure to pass code-generated
// terms, but still using them as plain strings inside the query template.
// When database schema is changed and regenerated, compilation errors will help
// detecting usage of wrong column and table names.
func (tc *Templates) SQL(tpl string, terms ...sqlitegen.Term) string {
	if v, ok := tc.m.Load(tpl); ok {
		return v.(string)
	}

	termSet := make(map[string]string, len(terms))
	for _, term := range terms {
		str := term.String()
		termSet[str] = str
	}

	var b strings.Builder
	if err := template.Must(template.New("").Funcs(template.FuncMap{
		"t": func(name string) string {
			v, ok := termSet[name]
			if !ok {
				panic("NO SUCH TERM " + name)
			}
			return v
		},
	}).Parse(tpl)).Execute(&b, nil); err != nil {
		panic(err)
	}

	str := b.String()

	tc.m.Store(tpl, str)

	return str
}
