import React from 'react'
import {useSlate, ReactEditor} from 'slate-react'
import {Range, Node} from 'slate'
import {css} from 'emotion'
import {ToolbarLink, ToolbarImage} from './toolbar'

export function SectionToolbar() {
  const editor = useSlate()
  const wrapper = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const element = wrapper.current
    const {selection} = editor

    if (!element || !selection) {
      return
    }

    if (
      ReactEditor.isFocused(editor) &&
      Range.isCollapsed(selection) &&
      selection.focus.offset === 0
    ) {
      console.log('selection is available')
      const path = selection.anchor.path
      const domSelection = window.getSelection() || Node.get(editor, path)
      const domRange = domSelection.getRangeAt(0)
      const rect = domRange.getBoundingClientRect()
      const parentRect = element.parentElement?.getBoundingClientRect()

      if (rect && parentRect) {
        element.style.opacity = '1'
        element.style.top = `${rect.top - parentRect.top - rect.height / 2}px`
        element.style.left = `${rect.left - parentRect.left}px`
      }
    } else {
      console.log('no selection is available')

      element.removeAttribute('style')
    }
    console.log('selection => ', selection)
  })

  return (
    <div
      ref={wrapper}
      contentEditable={false}
      className={`${css`
        position: absolute;
        padding-right: 16px;
        opacity: 0;
        transform: translateX(-100%);
      `}`}
    >
      <div
        className={css`
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid #cdcdcd;
          padding: 0 16px;
          display: flex;
          align-items: center;
        `}
      >
        <ToolbarLink
          className={css`
            padding: 4px;
          `}
          size={20}
        />
        <ToolbarImage
          className={css`
            padding: 4px;
          `}
          size={20}
        />
      </div>
    </div>
  )
}
