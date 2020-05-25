import React from 'react'
import {MARK_ITALIC} from 'slate-plugins-next'
import {RenderLeafProps} from 'slate-react'

export function renderLeafItalic() {
  return function({children, leaf}: RenderLeafProps) {
    if (leaf[MARK_ITALIC]) return <em className="italic">{children}</em>
    return children
  }
}
