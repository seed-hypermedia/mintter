package colx

// Object in this file means an open-ended map (like a JavaScript object).

// ObjectSet sets a value in a nested map by path.
func ObjectSet(v map[string]any, path []string, value any) {
	for i := 0; i < len(path)-1; i++ {
		key := path[i]

		if _, ok := v[key]; !ok {
			v[key] = make(map[string]any)
		}

		v = v[key].(map[string]any)
	}

	v[path[len(path)-1]] = value
}

// ObjectDelete value from a nested map by path.
// It can panic if some of the values in the path are not maps.
func ObjectDelete(v map[string]any, path []string) {
	for i := 0; i < len(path)-1; i++ {
		key := path[i]

		if _, ok := v[key]; !ok {
			return
		}

		v = v[key].(map[string]any)
	}

	delete(v, path[len(path)-1])
}

// ObjectGet gets a value from a nested map by path.
func ObjectGet(v map[string]any, path []string) (value any, ok bool) {
	if v == nil {
		return nil, false
	}

	for i := 0; i < len(path)-1; i++ {
		key := path[i]

		vv, ok := v[key].(map[string]any)
		if !ok {
			return nil, false
		}

		v = vv
	}

	value, ok = v[path[len(path)-1]]
	return value, ok
}
