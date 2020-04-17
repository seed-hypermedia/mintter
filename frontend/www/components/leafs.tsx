import React from 'react'
import {RenderLeafProps} from 'slate-react'

import {
  MARK_BOLD,
  MARK_CODE,
  MARK_ITALIC,
  MARK_UNDERLINE,
} from 'slate-plugins-next'

export const renderLeafBold = () => ({children, leaf}: RenderLeafProps) => {
  if (leaf[MARK_BOLD]) return <strong className="font-bold">{children}</strong>

  return children
}

export const renderLeafInlineCode = () => ({
  children,
  leaf,
}: RenderLeafProps) => {
  if (leaf[MARK_CODE]) {
    return (
      <code className="bg-muted text-body text-sm py-1 px-2 rounded-sm border-none">
        {children}
      </code>
    )
  }

  return children
}

export const renderLeafItalic = () => ({children, leaf}: RenderLeafProps) => {
  if (leaf[MARK_ITALIC]) return <em>{children}</em>
  return children
}

export const renderLeafUnderline = () => ({
  children,
  leaf,
}: RenderLeafProps) => {
  if (leaf[MARK_UNDERLINE]) return <span className="underline">{children}</span>

  return children
}
