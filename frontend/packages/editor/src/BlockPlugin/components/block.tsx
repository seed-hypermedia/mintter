import React from 'react'
import {DragDrop} from './DragDrop'

export function BlockBase(
  {attributes, element, className = '', ...props},
  ref,
) {
  return (
    <DragDrop
      attributes={attributes}
      element={element}
      componentRef={ref}
      {...props}
    >
      <div className={`relative pl-4 pr-0 ${className}`} {...props} />
    </DragDrop>
  )
}

export const Block = React.forwardRef(BlockBase)
