import React, {useState} from 'react'
import {useFocused, useSelected} from 'slate-react'
import {ImageKeyOption, ImagePluginOptionsValues} from '@udecode/slate-plugins'

export const ELEMENT_IMAGE = 'img'

export const IMAGE_OPTIONS: Record<
  ImageKeyOption,
  Required<ImagePluginOptionsValues>
> = {
  img: {
    component: ImageBlock,
    type: ELEMENT_IMAGE,
    rootProps: {},
  },
}

export function ImageBlock({attributes, element}) {
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
