import React from 'react'
import {
  HoveringToolbar,
  MARK_BOLD,
  MARK_ITALIC,
  toggleMark,
  isMarkActive,
  isBlockActive,
  ListType,
  insertLink,
  isLinkActive,
  PARAGRAPH,
  HeadingType,
} from 'slate-plugins-next'
import Icons from './icons'
import {useSlate} from 'slate-react'

export function ToolbarBoldMark() {
  return <ToolbarMark mark={MARK_BOLD} icon="Bold" />
}

export function ToolbarMarkItalic() {
  return <ToolbarMark mark={MARK_ITALIC} icon="Italic" />
}

export function ToolbarBlockUList() {
  return <ToolbarBlock type={ListType.UL_LIST} icon="List" />
}

export function ToolbarBlockOList() {
  return <ToolbarBlock type={ListType.OL_LIST} icon="OList" />
}

export function ToolbarBlockLink() {
  const editor = useSlate()
  return (
    <ToolbarButton
      active={isLinkActive(editor)}
      onClick={() => {
        const url = window.prompt('Enter the URL of the link:')
        if (!url) return
        insertLink(editor, url)
      }}
      icon="Link"
    />
  )
}

export function ToolbarBlockP() {
  return <ToolbarBlock type={PARAGRAPH} icon="P" />
}

export function ToolbarBlockH1() {
  return <ToolbarBlock type={HeadingType.H1} icon="H1" />
}

export function ToolbarBlockH2() {
  return <ToolbarBlock type={HeadingType.H2} icon="H2" />
}

export interface ToolbarButtonProps {
  onClick: () => void
  icon: string
  className?: string
  size?: number
  active: boolean
}

export function ToolbarButton({
  className,
  icon,
  onClick,
  active = false,
  size = 24,
}: ToolbarButtonProps) {
  const Icon = Icons[icon]

  function handleClick(e) {
    e.preventDefault()

    if (onClick) {
      onClick()
    }
  }

  return (
    <button
      onMouseDown={handleClick}
      className={`${
        active ? 'text-toolbar-active' : 'text-toolbar'
      } ${className}`}
    >
      <Icon size={size} color="currentColor" />
    </button>
  )
}

export function ToolbarMark({icon, mark}) {
  const editor = useSlate()

  function handleClick() {
    toggleMark(editor, mark)
  }

  return (
    <ToolbarButton
      icon={icon}
      onClick={handleClick}
      active={isMarkActive(editor, mark)}
    />
  )
}

export function ToolbarBlock({icon, type}) {
  const editor = useSlate()

  function handleClick() {
    editor.toggleBlock(type)
  }

  return (
    <ToolbarButton
      icon={icon}
      onClick={handleClick}
      active={isBlockActive(editor, type)}
    />
  )
}

export function Separator() {
  return <div className="w-px h-4 bg-toolbar" />
}

export function Toolbar() {
  // const editor = useSlate()
  return (
    <HoveringToolbar className="theme-dark">
      <ToolbarBoldMark />
      <ToolbarMarkItalic />
      <ToolbarBlockUList />
      <ToolbarBlockOList />
      <ToolbarBlockLink />
      <Separator />
      <ToolbarBlockP />
      <ToolbarBlockH1 />
      <ToolbarBlockH2 />
    </HoveringToolbar>
  )
}
