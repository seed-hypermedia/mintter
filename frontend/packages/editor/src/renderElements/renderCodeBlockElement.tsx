import React from 'react'
import {getRenderElement} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'

export function renderCodeBlockElement() {
  return getRenderElement({
    type: nodeTypes.typeCode,
    component: ({children, ...props}) => (
      <pre
        {...props}
        className="mt-4 p-4 md:-mx-8 md:px-8 box-border w-auto block relative bg-background-emphasize rounded-md"
      >
        <code className="font-mono text-md text-body">{children}</code>
      </pre>
    ),
    rootProps: {},
  })
}
