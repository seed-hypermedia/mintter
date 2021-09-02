package blockdoc

import "mintter/backend/crdt"

// NewReconciler creates a set of WalkHandlers that will modify current state of the document
// to confirm the new state which the one WalkHandler are applied to.
func NewReconciler(state *Document) WalkHandlers {
	var (
		leftSibling string
	)

	wlk := NewWalkHandlers()
	wlk.HandleListStart = func(id string) error {
		leftSibling = ""
		return nil
	}
	wlk.HandleBlockStart = func(id, parent string, depth int) error {
		if parent == "" {
			parent = crdt.RootNodeID
		}

		if err := state.tree.SetNodePosition(state.siteID, id, parent, leftSibling); err != nil {
			return err
		}

		leftSibling = id
		return nil
	}

	return wlk
}
