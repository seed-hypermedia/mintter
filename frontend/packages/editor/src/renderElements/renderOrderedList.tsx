import React from 'react'
import {getRenderElement} from 'slate-plugins-next'
import {nodeTypes} from '../nodeTypes'
import {css} from 'emotion'

export function renderOrderedList() {
  return getRenderElement({
    type: nodeTypes.typeOl,
    component: ({children, ...props}) => (
      <ol
        {...props}
        className={`list-inside ${css`
          list-style: none;
          counter-reset: item;

          li {
            counter-increment: item;

            &:before {
              margin-right: 8px;
              content: counters(item, '.') '. ';
              display: inline-block;
            }
          }

          ol {
            padding-left: 2rem;
          }
        `}`}
      >
        {children}
      </ol>
    ),
  })
}
