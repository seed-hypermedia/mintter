import React from 'react'
import {getRenderElement} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'
import {css} from 'emotion'

export function renderUnorderedList() {
  return getRenderElement({
    type: nodeTypes.typeUl,
    component: ({children, ...props}) => (
      <ul
        {...props}
        className={`list-inside ${css`
          list-style-type: disc;
          ul {
            list-style-type: circle;
            padding-left: 2rem;
          }

          ul ul {
            list-style-type: square;
          }
        `}`}
      >
        {children}
      </ul>
    ),
  })
}
