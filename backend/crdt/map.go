package crdt

import "fmt"

type mapValue struct {
	ID    ID
	Value interface{}
}

type Map struct {
	m      map[string]mapValue
	vclock *VectorClock
}

func (m *Map) Apply(id ID, key string, value interface{}) error {
	if err := m.vclock.Track(id); err != nil {
		return fmt.Errorf("failed to set map key %s: %w", key, err)
	}

	// We want to update the value only if the incoming one is newer.
	old, ok := m.m[key]
	if !ok || old.ID.Less(id) {
		m.m[key] = mapValue{ID: id, Value: value}
	}

	return nil
}
