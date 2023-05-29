package maputil

func Set(v map[string]any, path []string, value any) {
	for i := 0; i < len(path)-1; i++ {
		key := path[i]

		if _, ok := v[key]; !ok {
			v[key] = make(map[string]any)
		}

		v = v[key].(map[string]any)
	}

	v[path[len(path)-1]] = value
}

func Delete(v map[string]any, path []string) {
	for i := 0; i < len(path)-1; i++ {
		key := path[i]

		if _, ok := v[key]; !ok {
			v[key] = make(map[string]any)
		}

		v = v[key].(map[string]any)
	}

	delete(v, path[len(path)-1])
}
