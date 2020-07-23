import React from 'react'
import {getRenderElement} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'

export function renderBlockquote() {
  return getRenderElement({
    type: nodeTypes.typeBlockquote,
    component: ({children, ...props}) => (
      
    ),
    rootProps: {},
  })
}
