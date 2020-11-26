import React from 'react'

export function Page({children, className = ''}) {
  return (
    <div
      className={`relative overflow-auto row-start-2 ${className}`}
      data-testid="page"
    >
      {children}
    </div>
  )
}
