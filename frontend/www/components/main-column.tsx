import React from 'react'
// import {css} from 'emotion'
export function MainColumn({children, className = ''}) {
  return (
    <div className={`w-full mb-12 pt-4 mx-4 md:mx-0 ${className}`}>
      {children}
    </div>
  )
}
