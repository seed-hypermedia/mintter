import React from 'react'
import {
  HoveringToolbar,
  ToolbarMark,
  ToolbarBlock,
  ToolbarImage,
  ToolbarCode,
  MARK_BOLD,
  MARK_ITALIC,
  MARK_CODE,
} from 'slate-plugins-next'
import {Bold, Italic, Code} from 'react-feather'

export function Toolbar() {
  return (
    <HoveringToolbar>
      <ToolbarBoldMark />
      <ToolbarMarkItalic />
      <ToolbarMarkCode />
    </HoveringToolbar>
  )
}

export function ToolbarBoldMark() {
  return <ToolbarMark reversed format={MARK_BOLD} icon={<Bold />} />
}

export function ToolbarMarkItalic() {
  return <ToolbarMark reversed format={MARK_ITALIC} icon={<Italic />} />
}

export function ToolbarMarkCode() {
  return <ToolbarMark reversed format={MARK_CODE} icon={<Code />} />
}

export {ToolbarMark, ToolbarBlock, ToolbarImage, ToolbarCode}
