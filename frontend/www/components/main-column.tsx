import React from 'react'
import {css} from 'emotion'
export function MainColumn({children}) {
  return (
    <div
      className={`flex-1 mx-auto w-full pt-8 px-6 mb-12 ${css`
        max-width: 64ch;
      `}`}
    >
      {children}
    </div>
  )
}
