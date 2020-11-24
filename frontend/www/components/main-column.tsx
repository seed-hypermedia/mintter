import React from 'react'
// import {css} from 'emotion'
export function MainColumn({children, className = ''}) {
  return (
    <div className={`mb-12 pt-4 px-4 box-content ${className}`}>{children}</div>
  )
}
