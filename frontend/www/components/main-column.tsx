import React from 'react'
// import {css} from 'emotion'
export function MainColumn({children, className = ''}) {
  return (
    <div className={`w-full px-4 md:px-6 mb-12 pt-4 mx-0 ${className}`}>
      {children}
    </div>
  )
}
