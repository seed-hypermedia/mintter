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
  const selected = useSelected()
  console.log('ImageBlock -> selected', selected)
  const focused = useFocused()
  console.log('ImageBlock -> focused', focused)
  const [error, setError] = useState('')
  const [file, setFile] = useState<any>(() => element.url || null)

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
      const url = URL.createObjectURL(file)
      console.log('handleOnChange -> url', url)
      setFile(url)
      setError('')
    }
  }

  return (
    <div contentEditable={false} {...attributes}>
      <div
        contentEditable={false}
        className={`relative border-2 overflow-hidden rounded ${
          focused || selected ? 'border-blue-200' : 'border-transparent'
        }`}
      >
        {file ? (
          <img
            contentEditable={false}
            className="block w-full"
            data-slate-type={type}
            src={file}
            alt=""
            // selected={selected}
            // focused={focused}
          />
        ) : (
          <div className="p-4">
            <input
              type="file"
              accept="image/png, image/jpeg, image/gif"
              onChange={handleOnChange}
            />
          </div>
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
