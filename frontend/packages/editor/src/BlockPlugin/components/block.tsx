import React from 'react'

export function Block({className = '', ...props}) {
  return <div className={`relative pl-4 pr-0 py-2 ${className}`} {...props} />
}
