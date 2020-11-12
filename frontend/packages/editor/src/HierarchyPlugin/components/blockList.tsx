import React from 'react'

export function BlockList({attributes, children}) {
  return (
    <div className="p-0 md:pl-4" {...attributes}>
      {children}
    </div>
  )
}
