import React from 'react'
import {
  getRenderElement,
  ImageRenderElementProps,
  ImageRenderElementOptions,
} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'
import {useFocused, useSelected} from 'slate-react'

export function renderImageBlock({
  typeImg = nodeTypes.typeImg,
  component = ImageBlock,
}: ImageRenderElementOptions = {}) {
  return getRenderElement({
    type: typeImg,
    component,
  })
}

export function ImageBlock({attributes, element}: ImageRenderElementProps) {
  const {url} = element
  const selected = useSelected()
  const focused = useFocused()

  const type = attributes['data-slate-type']
  delete attributes['data-slate-type']

  return (
    <div {...attributes}>
      <div
        contentEditable={false}
        className={`p-2 rounded bg-background-muted border-2 ${
          focused && selected ? 'border-blue-200' : 'border-transparent'
        }`}
      >
        {url ? (
          <img
            className="block w-full"
            data-slate-type={type}
            src={url}
            alt=""
            // selected={selected}
            // focused={focused}
          />
        ) : (
          <>
            <p>choose image here (soon)</p>
            <button onClick={() => {}}>upload</button>
          </>
        )}
      </div>
    </div>
  )
}
