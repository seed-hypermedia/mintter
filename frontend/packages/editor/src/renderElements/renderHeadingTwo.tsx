import React from 'react'
import {getRenderElement} from 'slate-plugins-next'
import {nodeTypes} from '../nodeTypes'

export function renderHeadingTwo() {
  return getRenderElement({
    type: nodeTypes.typeH2,
    component: ({children, ...props}) => (
      <h2 {...props} className="text-3xl text-heading mt-8">
        {children}
      </h2>
    ),
  })
}
