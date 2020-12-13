import {BlockRefList} from '@mintter/api/v2/documents_pb'
import React from 'react'

export function BlockList({attributes, children, element}) {
  return (
    <div
      className={`pl-2 md:pl-4 list-inside ${
        element.listType === BlockRefList.Style.BULLET
          ? 'list-disc'
          : element.listType === BlockRefList.Style.NUMBER
          ? 'list-decimal'
          : 'list-none'
      }`}
      {...attributes}
    >
      {children}
    </div>
  )
}
