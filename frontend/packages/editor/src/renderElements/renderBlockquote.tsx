import React from 'react'
import {getRenderElement} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'

export function renderBlockquote() {
  return getRenderElement({
    type: nodeTypes.typeBlockquote,
    component: ({children, ...props}) => (
      <blockquote
        {...props}
        className="mt-4 p-4 md:-mx-8 md:px-8 box-border w-auto block relative border-l-4 border-muted-hover bg-background-muted rounded-md rounded-tl-none rounded-bl-none"
      >
        <p className="italic text-xl font-light font-serif text-body">
          {children}
        </p>
      </blockquote>
    ),
    rootProps: {},
  })
}
