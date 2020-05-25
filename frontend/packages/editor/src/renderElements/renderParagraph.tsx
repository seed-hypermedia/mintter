import React from 'react'
import {getRenderElement} from 'slate-plugins-next'
import {nodeTypes} from '../nodeTypes'

export function renderParagraph() {
  return getRenderElement({
    type: nodeTypes.typeP,
    component: ({children, ...props}) => (
      <p {...props} className={`text-body mt-4`}>
        {children}
      </p>
    ),
  })
}
