package vcs

type TimeDAG struct {
	root string

	from map[string]map[string]struct{}
	to   map[string]map[string]struct{}
}

func NewTimeDAG(root string) *TimeDAG {
	return &TimeDAG{
		root: root,
		from: make(map[string]map[string]struct{}),
		to:   make(map[string]map[string]struct{}),
	}
}

func (dag *TimeDAG) AddEdge(from, to string) {
	// TODO: check for cycles in the DAG. In practice there can't be,
	// because changes are content-addresssable.

	if _, ok := dag.from[from]; !ok {
		dag.from[from] = make(map[string]struct{})
	}
	dag.from[from][to] = struct{}{}

	if _, ok := dag.to[to]; !ok {
		dag.to[to] = make(map[string]struct{})
	}
	dag.to[to][from] = struct{}{}
}

type ChangeIterator interface {
	Next() bool
	Value() Change
}
