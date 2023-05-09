import {ElementDrag} from '@app/editor/drag-section'
import {RenderElementProps} from 'slate-react'

export function BlockElement({
  attributes,
  children,
  element,
}: RenderElementProps) {
  return (
    <ElementDrag element={element} attributes={attributes}>
      {children}
    </ElementDrag>
  )
  // return children
}
