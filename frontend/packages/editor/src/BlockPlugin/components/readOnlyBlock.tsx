import React from 'react'
import {RenderElementProps, ReactEditor, useEditor} from 'slate-react'
import {Block} from './block'

function ReadonlyBlockElement(
  {children, element, ...rest}: RenderElementProps,
  ref: React.RefObject<HTMLDivElement>,
) {
  const editor = useEditor()
  const path = ReactEditor.findPath(editor, element)

  return (
    <Block
      path={path}
      data-slate-type={element.type}
      innerRef={ref as any}
      {...rest}
    >
      {children}
    </Block>
  )
}

// TODO: (Horacio) Fixme types
export const ReadOnlyBlock = React.forwardRef(ReadonlyBlockElement as any)
