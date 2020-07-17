import React, {useState} from 'react'
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
  console.log('ImageBlock -> selected', selected)
  const focused = useFocused()
  const [error, setError] = useState('')
  const [, setFile] = useState(null)

  const type = attributes['data-slate-type']
  delete attributes['data-slate-type']

  function handleOnChange(e: any) {
    const [file]: any = Array.from(e.target.files)

    const types = ['image/png', 'image/jpeg', 'image/gif']

    if (!types.includes(file.type)) {
      setError('file type is not supported')
      setFile(null)
    } else if (file.size > 150000) {
      setError('file is too big')
      setFile(null)
    } else {
      setFile(file)
    }
  }

  return (
    <div {...attributes}>
      <div
        contentEditable={false}
        className={`relative px-8 py-2 first:mt-8 hover:bg-background-muted transition duration-200 rounded ${
          focused || selected ? 'bg-background-muted' : 'border-transparent'
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
            <input type="file" onChange={handleOnChange} />
          </>
        )}
      </div>
      {error && (
        <p className="bg-red-500 px-4 py-2 rounded-md border-px border-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
