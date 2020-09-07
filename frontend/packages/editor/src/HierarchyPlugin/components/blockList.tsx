import React from 'react'
import {Droppable} from 'react-beautiful-dnd'
import {mergeRefs} from '../../mergeRefs'

export function BlockList({element, attributes, children}) {
  return (
    <Droppable droppableId={element.id} type="block">
      {(provided, snapshot) => (
        <div
          {...attributes}
          ref={mergeRefs(provided.innerRef, attributes.ref)}
          {...provided.droppableProps}
          className={`first:mt-4 ${
            snapshot.isDraggingOver ? 'bg-background-muted' : ''
          }`}
        >
          {children}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  )
}
