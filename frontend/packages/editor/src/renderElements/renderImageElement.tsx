import React from 'react'
import {
  getRenderElement,
  ImageRenderElementProps,
  ImageRenderElementOptions,
} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'
// import {useFocused, useSelected} from 'slate-react'

export function renderImageElement({
  typeImg = nodeTypes.typeImg,
  component = ImageElement,
}: ImageRenderElementOptions = {}) {
  return getRenderElement({
    type: typeImg,
    component,
  })
}

export function ImageElement({
  attributes,
  children,
  element,
}: ImageRenderElementProps) {
  const {url} = element
  //   const selected = useSelected()
  //   const focused = useFocused()

  const type = attributes['data-slate-type']
  delete attributes['data-slate-type']

  return (
    <div {...attributes}>
      <div contentEditable={false}>
        <img
          className="block w-full"
          data-slate-type={type}
          src={url}
          alt=""
          //   selected={selected}
          //   focused={focused}
        />
      </div>
      {children}
    </div>
  )
}
