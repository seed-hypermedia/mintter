import React from 'react'
import Tippy from '@tippyjs/react'
import {css} from 'emotion'

export function Tooltip({
  children,
  delay = 500,
  content = 'tooltip content here',
  ...props
}) {
  return (
    <Tippy
      delay={delay}
      content={
        <span
          className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
            background-color: #333;
            color: #ccc;
          `}`}
        >
          {content}
        </span>
      }
      {...props}
    >
      {children}
    </Tippy>
  )
}
