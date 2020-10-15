import React from 'react'

export function BlockList({attributes, children}) {
  return (
    <div className="pl-4" {...attributes}>
      {children}
    </div>
  )
}
