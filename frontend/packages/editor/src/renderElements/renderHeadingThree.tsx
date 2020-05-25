import React from 'react'
import {getRenderElement} from 'slate-plugins-next'
import {nodeTypes} from '../nodeTypes'

export function renderHeadingThree() {
  return getRenderElement({
    type: nodeTypes.typeH3,
    component: ({children, ...props}) => (
      <h3 {...props} className="text-2xl text-heading mt-8">
        {children}
      </h3>
    ),
  })
}
