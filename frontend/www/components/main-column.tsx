import React from 'react'
import {css} from 'emotion'
export function MainColumn({children}) {
  return (
    <div
      className={`flex-1 w-full pt-8 px-6 mb-12 mx-16 ${css`
        max-width: 50ch;
      `}`}
    >
      {children}
    </div>
  )
}
