import React, {RefObject} from 'react'
import {RenderElementProps} from 'slate-react'

export function Section(
  {children, element, ...attributes}: RenderElementProps,
  ref: RefObject<HTMLDivElement>,
) {
  return (
    <div
      data-slate-type={element.type}
      {...attributes}
      ref={ref}
      className={`px-8 py-8 pt-4 mt-8 first:mt-0 border-t first:border-0 border-muted`}
    >
      {children}
    </div>
  )
}

export default React.forwardRef(Section)
