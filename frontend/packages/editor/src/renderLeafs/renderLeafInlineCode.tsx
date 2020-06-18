import React from 'react'
import {MARK_CODE} from '@udecode/slate-plugins'
import {RenderLeafProps} from 'slate-react'

export function renderLeafInlineCode() {
  return function({children, leaf}: RenderLeafProps) {
    if (leaf[MARK_CODE]) {
      return (
        <code className="bg-muted text-body text-sm py-1 px-2 rounded-sm border-none">
          {children}
        </code>
      )
    }

    return children
  }
}
