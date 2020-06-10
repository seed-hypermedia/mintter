import React from 'react'
import {css} from 'emotion'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export default function Container({
  children,
  className = '',
  ...props
}: ContainerProps) {
  return (
    <div
      className={`w-full mx-auto p-4 ${css`
        max-width: 80ch;
      `} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
