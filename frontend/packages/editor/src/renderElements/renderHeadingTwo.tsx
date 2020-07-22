import React from 'react'
import {getRenderElement} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'

export function renderHeadingTwo() {
  return getRenderElement({
    type: nodeTypes.typeH2,
    component: ({children, ...props}) => (
      <h2 {...props} className="text-3xl text-heading my-6">
        {children}
      </h2>
    ),
    rootProps: {},
  })
}
