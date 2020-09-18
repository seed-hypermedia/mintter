# Drag and Drop

## Pieces to implement

- `useDragBlock`
  - call `useDrag` passing item, collect, begin and end
  - begin and end toggle a `dragging` class at the body (?)
- `useDropBlockOnEditor`
  - calls `useDrop`
  - accept `block`
  - drop function has all the editor logic
  - collect returns monitor.isOver()
  -
- `useDndBlock`
  - params: id, blockRef
  -
- `getSelectableElement`
  - check the level?
  - also filter function?
  - depending if is filtered, wrap the component with the `Selectable` component
    (all the drag/drop logic)
