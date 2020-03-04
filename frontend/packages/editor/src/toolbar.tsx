import React from 'react'
import {useSlate, ReactEditor} from 'slate-react'
import {Portal} from './portal'
import {Editor} from 'slate'
import {Range} from 'slate'

export function Toolbar({children, className}) {
  const ref = React.useRef<any>()
  const editor = useSlate()

  React.useEffect(() => {
    const el = ref.current
    const {selection} = editor

    if (!el) {
      return
    }

    if (
      !selection ||
      !ReactEditor.isFocused(editor) ||
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) === ''
    ) {
      el.removeAttribute('style')
      return
    }

    // TODO: fix types here
    const domSelection: any = window.getSelection()
    const domRange = domSelection.getRangeAt(0)
    const rect = domRange.getBoundingClientRect()
    el.style.opacity = '1'
    el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight}px`
    el.style.left = `${rect.left +
      window.pageXOffset -
      el.offsetWidth / 2 +
      rect.width / 2}px`
  })
  return (
    <Portal>
      <div ref={ref} className={className}>
        {children}
      </div>
    </Portal>
  )
}
