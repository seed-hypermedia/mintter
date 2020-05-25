import React from 'react'
import {getRenderElement} from 'slate-plugins-next'
import {nodeTypes} from '../nodeTypes'

export function renderHeadingOne() {
  return getRenderElement({
    type: nodeTypes.typeH1,
    component: ({children, ...props}) => (
      <h1 {...props} className="text-4xl text-heading mt-8 leading-normal">
        {children}
      </h1>
    ),
  })
}
