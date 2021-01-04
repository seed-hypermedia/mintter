import React from 'react'
import {BlockRefList} from '@mintter/api/v2/documents_pb'

export function BlockList({attributes, children, element}) {
  const Component = element.listType === BlockRefList.Style.NUMBER ? 'ol' : 'ul'
  return (
    <Component
      {...attributes}
      className={`${
        element.listType === BlockRefList.Style.NONE ? 'list-none' : ''
      }`}
    >
      {children}
    </Component>
  )
}
