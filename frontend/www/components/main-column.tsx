import React from 'react'
import {css} from 'emotion'
export function MainColumn({children}) {
  return (
    <div
      className={`w-full mx-0 md:mx-16 px-4 md:px-6 mb-12 pt-4 ${css`
        max-width: 50ch;
      `}`}
    >
      {children}
    </div>
  )
}
