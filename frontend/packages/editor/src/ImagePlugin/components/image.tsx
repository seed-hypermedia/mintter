import React, {useState, useMemo} from 'react'
import {useSelected, useEditor} from 'slate-react'
import {Transforms} from 'slate'
import {useHover} from '@react-aria/interactions'
import {useToggleState} from '@react-stately/toggle'

export function ImageBlock({attributes, element, children}) {
  const selected = useSelected()
  const editor = useEditor()
  const [error, setError] = useState('')
  const [file, setFile] = useState<any>(() => element.url || null)
  const {isSelected, setSelected} = useToggleState()

  // const type = attributes['data-slate-type']
  // delete attributes['data-slate-type']

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
      setFile(url)
      Transforms.setNodes(editor, {url})
      setError('')
    }
  }

  function handleCaption(e) {
    Transforms.setNodes(editor, {caption: e.target.value})
  }

  const caption = useMemo<string>(() => element.caption ?? '', [element])
  return (
    <div
      {...attributes}
      className={`group first:mt-8 relative overflow-hidden bg-red-500 p-4 ${
        selected ? 'border-info' : 'border-transparent'
      }`}
    >
      <div contentEditable={false}>
        {file ? (
          <Image
            src={file}
            alt={caption}
            onAddCaption={() => setSelected(!isSelected)}
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

        {isSelected && (
          <input
            className="bg-transparent text-body text-sm w-full mt-2 border border-transparent rounded-sm"
            type="text"
            placeholder="caption here"
            value={caption}
            onChange={handleCaption}
          />
        )}

        {error && (
          <p className="bg-danger px-4 py-2 rounded-md border-px text-body border-red-700">
            {error}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}

export function Image({src, alt, onAddCaption, ...rest}) {
  let {hoverProps, isHovered} = useHover({})
  return (
    <div className={`relative border-2 border-background-muted`}>
      <div
        className={`absolute top-0 right-0 m-2 rounded-sm bg-black shadow-sm transition duration-100 opacity-0 hover:opacity-100 ${
          isHovered ? 'opacity-100' : ''
        }`}
      >
        <button
          onClick={onAddCaption}
          className="text-sm p-1 text-white hover:bg-background-toolbar"
        >
          caption
        </button>
      </div>
      <img
        {...hoverProps}
        src={src}
        alt={alt}
        className={`block w-full ${isHovered ? 'border-yellow-500' : ''}`}
        {...rest}
      />
    </div>
  )
}
