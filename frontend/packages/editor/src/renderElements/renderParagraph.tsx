import React from 'react'
import {getRenderElement} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'

export function renderParagraph() {
  return getRenderElement({
    type: nodeTypes.typeP,
    component: ({children, ...props}) => (
      <p {...props} className={`text-body text-xl leading-loose`}>
        {children}
      </p>
    ),
    rootProps: {},
  })
}
