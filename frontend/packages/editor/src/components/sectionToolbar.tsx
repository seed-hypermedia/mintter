import React from 'react'
import {useSlate} from 'slate-react'
import {css} from 'emotion'

export function SectionToolbar() {
  const editor = useSlate()
  console.log('editor => ', editor.selection)
  return (
    <p
      contentEditable={false}
      className={css`
        background-color: red;
        position: absolute;
        left: 0;
        transform: translateX(-100%);
      `}
    >
      section toolbar
    </p>
  )
}
