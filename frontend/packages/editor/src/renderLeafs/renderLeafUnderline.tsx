import React from 'react'
import {MARK_UNDERLINE} from '@udecode/slate-plugins'
import {RenderLeafProps} from 'slate-react'

export function renderLeafUnderline() {
  return function({children, leaf}: RenderLeafProps) {
    if (leaf[MARK_UNDERLINE])
      return <span className="underline">{children}</span>

    return children
  }
}
