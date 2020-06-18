import React from 'react'
import {MARK_BOLD} from '@udecode/slate-plugins'
import {RenderLeafProps} from 'slate-react'

export function renderLeafBold() {
  return function({children, leaf}: RenderLeafProps) {
    if (leaf[MARK_BOLD])
      return <strong className="font-bold">{children}</strong>

    return children
  }
}
