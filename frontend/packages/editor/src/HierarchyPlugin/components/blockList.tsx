import React from 'react'

export function BlockList({attributes, children}) {
  return (
    <div {...attributes} className={`first:mt-4`}>
      {children}
    </div>
  )
}

export function ReadOnlyBlockList({attributes, children}) {
  return (
    <div {...attributes} className={`first:mt-4`}>
      {children}
    </div>
  )
}
