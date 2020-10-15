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
      <div className={`relative ${className}`} {...props} />
    </DragDrop>
  )
}

export const Block = React.forwardRef(BlockBase)
