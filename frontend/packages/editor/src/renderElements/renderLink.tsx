import React from 'react'
import {getRenderElement} from 'slate-plugins-next'
import {nodeTypes} from '../nodeTypes'
import {css} from 'emotion'

export function renderLink() {
  return getRenderElement({
    type: nodeTypes.typeLink,
    component: ({children, ...props}) => (
      <a
        {...props}
        className={`text-primary cursor-pointer hover:text-primary-hover transition duration-200 ${css`
          p {
            display: inline;
          }
        `}`}
        onClick={() => window.open(props.element.url as string, '_blank')}
        href={props.element.url as string}
      >
        {children}
      </a>
    ),
  })
}
