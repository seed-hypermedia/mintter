import React from 'react'
import {useSlate, ReactEditor} from 'slate-react'
import {Range, Node, Path} from 'slate'
import {css} from 'emotion'
import {BLOCKQUOTE} from 'slate-plugins-next'
import {Plus} from 'react-feather'

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
      const node = Node.get(editor, Path.parent(path))
      console.log('node => ', node)
      const domSelection = window.getSelection() || Node.get(editor, path)
      const domRange = domSelection.getRangeAt(0)
      const rect = domRange.getBoundingClientRect()
      const parentRect = element.parentElement?.getBoundingClientRect()

      if (rect && parentRect) {
        element.style.opacity = '1'
        element.style.top = `${rect.top + rect.height / 2 - parentRect.top}px`
        const factor = node.type === BLOCKQUOTE ? 24 : 0
        // element.style.left = `${rect.left - parentRect.left - factor}px`
        element.style.left = `${-8 - factor}px`
      }
    } else {
      element.removeAttribute('style')
    }
  })

  function createTextSection(event) {
    console.log('create text section', event)
  }

  return (
    <div
      data-testid="section-toolbar"
      ref={wrapper}
      contentEditable={false}
      className={`${css`
        box-sizing: border-box;
        position: absolute;
        padding-right: 16px;
        opacity: 0;
        transform: translate(-100%, -50%);
      `}`}
    >
      <div
        className={css`
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid #cdcdcd;
          padding: 0 8px;
          display: flex;
          align-items: center;
        `}
      >
        <button
          onClick={createTextSection}
          className={`text-muted-hover ${css`
            padding: 5px;
            font-size: 16px;
            line-height: 1.2;
          `}`}
        >
          ab
        </button>

        <div
          className={`bg-muted-hover ${css`
            width: 1px;
            height: 16px;
            margin: 0 4px;
          `}`}
        />
        <button
          className={css`
            padding: 5px;
            font-size: 16px;
            line-height: 1.2;
          `}
        >
          <Plus size={16} className="text-muted-hover" />
        </button>
      </div>
    </div>
  )
}
