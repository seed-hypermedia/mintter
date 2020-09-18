import React from 'react'

export function BlockList({attributes, children}) {
  return (
    <div {...attributes} className={`first:mt-4`}>
      {children}
    </div>
  )
}
