import React from 'react'

export function CustomLogo({width = '200px', className = ''}) {
  return (
    <img
      src="/ethosfera-logo.png"
      className={`inline-block ${className}`}
      style={{width, height: 'auto'}}
    />
  )
}
