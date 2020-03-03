import React from 'react'
import {RenderLeafProps} from 'slate-react'

export default function Leaf({attributes, children, leaf}: RenderLeafProps) {
  if (leaf.bold) {
    children = <strong className="font-semibold">{children}</strong>
  }

  if (leaf.code) {
    children = <code className="bg-green-800 text-white">{children}</code>
  }

  if (leaf.italic) {
    children = <em>{children}</em>
  }

  if (leaf.underline) {
    children = <u>{children}</u>
  }

  return <span {...attributes}>{children}</span>
}
