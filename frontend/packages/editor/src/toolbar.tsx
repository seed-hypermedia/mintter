import React from 'react'
import {
  HoveringToolbar,
  ToolbarMark,
  ToolbarBlock,
  ToolbarImage as DefaultToolbarImage,
  ToolbarCode,
  ToolbarLink as DefaultToolbarLink,
  MARK_BOLD,
  MARK_ITALIC,
  MARK_CODE,
} from 'slate-plugins-next'
import {Bold, Italic, Code, Link, Image} from 'react-feather'

export function Toolbar() {
  return (
    <HoveringToolbar>
      <ToolbarBoldMark />
      <ToolbarMarkItalic />
      <ToolbarMarkCode />
      <ToolbarImage />
      <ToolbarLink />
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

export function ToolbarLink() {
  return <DefaultToolbarLink icon={<Link />} />
}

export function ToolbarImage() {
  return <DefaultToolbarImage icon={<Image />} />
}

export {ToolbarMark, ToolbarBlock, ToolbarCode}
