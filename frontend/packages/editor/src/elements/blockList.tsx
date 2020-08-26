import React from 'react'
export const ELEMENT_BLOCK_LIST = 'block_list'

export const BLOCK_LIST_OPTIONS = {
  block_list: {
    type: ELEMENT_BLOCK_LIST,
    component: ({element, attributes, children, as: Component}) =>
      element.type === ELEMENT_BLOCK_LIST ? (
        <Component {...attributes} className="">
          {children}
        </Component>
      ) : null,
    rootProps: {
      as: 'div',
    },
  },
}
