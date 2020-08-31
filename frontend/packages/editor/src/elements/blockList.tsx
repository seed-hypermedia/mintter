import React from 'react'
import {Droppable} from 'react-beautiful-dnd'
import {mergeRefs} from '../mergeRefs'

export const ELEMENT_BLOCK_LIST = 'block_list'

export const BLOCK_LIST_OPTIONS = {
  block_list: {
    type: ELEMENT_BLOCK_LIST,
    component: BlockList,
    rootProps: {
      as: 'div',
    },
  },
}

function BlockList({element, attributes, children}) {
  return element.type === ELEMENT_BLOCK_LIST ? (
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
  ) : null
}
