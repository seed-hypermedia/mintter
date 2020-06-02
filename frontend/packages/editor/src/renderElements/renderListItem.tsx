import React from 'react'
import {getRenderElement} from 'slate-plugins-next'
import {nodeTypes} from '../nodeTypes'
import {css} from 'emotion'

export function renderListItem() {
  return getRenderElement({
    type: nodeTypes.typeLi,
    component: ({children, ...props}) => (
      <li
        {...props}
        className={`relative text-body ${css`
          display: list-item;
          p,
          div {
            display: inline-block;
            margin: 0;
            padding: 0;
          }
        `}`}
      >
        {children}
      </li>
    ),
  })
}
