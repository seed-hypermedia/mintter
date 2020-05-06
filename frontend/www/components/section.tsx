import React from 'react'

export default function Section({children, ...props}: any) {
  return (
    <div
      {...props}
      className={`px-8 py-8 pt-4 mt-8 first:mt-0 border-t first:border-0 border-muted`}
    >
      {children}
    </div>
  )
}
