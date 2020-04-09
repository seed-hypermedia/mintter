import React from 'react'
import {RenderLeafProps} from 'slate-react'

export default function Leaf({attributes, children, leaf}: RenderLeafProps) {
  if (leaf.bold) {
    children = <strong className="font-semibold">{children}</strong>
  }

  if (leaf.code) {
    children = (
      <code className="bg-muted text-body text-sm py-1 px-2 rounded-sm border-none">
        {children}
      </code>
    )
  }

  if (leaf.italic) {
    children = <em>{children}</em>
  }

  if (leaf.underline) {
    children = <u>{children}</u>
  }

  return <span {...attributes}>{children}</span>
}
