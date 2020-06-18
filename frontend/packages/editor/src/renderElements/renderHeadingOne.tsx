import React from 'react'
import {getRenderElement} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'

export function renderHeadingOne() {
  return getRenderElement({
    type: nodeTypes.typeH1,
    component: ({children, ...props}) => (
      <h1 {...props} className="text-4xl text-heading my-8 leading-normal">
        {children}
      </h1>
    ),
  })
}
