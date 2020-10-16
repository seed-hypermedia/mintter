import React from 'react'
import {css} from 'emotion'
export function MainColumn({children}) {
  return (
    <div
      className={`w-full px-6 mb-12 mx-16 pt-4 ${css`
        max-width: 50ch;
      `}`}
    >
      {children}
    </div>
  )
}
