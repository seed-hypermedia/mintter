import React from 'react'

export function BlockBase({className = '', ...props}, ref) {
  return (
    <div
      ref={ref}
      className={`relative pl-4 pr-0 py-2 ${className}`}
      {...props}
    />
  )
}

export const Block = React.forwardRef(BlockBase)
