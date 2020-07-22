import React from 'react'
import {getRenderElement} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'

export function renderHeadingThree() {
  return getRenderElement({
    type: nodeTypes.typeH3,
    component: ({children, ...props}) => (
      <h3 {...props} className="text-2xl text-heading my-6">
        {children}
      </h3>
    ),
    rootProps: {},
  })
}
