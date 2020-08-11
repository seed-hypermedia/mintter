import React, {useState, useMemo} from 'react'
import {useFocused, useSelected, useEditor, ReactEditor} from 'slate-react'
import {ImageKeyOption, ImagePluginOptionsValues} from '@udecode/slate-plugins'
import {Draggable} from 'react-beautiful-dnd'
import {Transforms} from 'slate'
import {css} from 'emotion'
import {mergeRefs} from '../mergeRefs'

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

export function ImageBlock({attributes, element, children}) {
  const selected = useSelected()
  const focused = useFocused()
  const editor = useEditor()
  const path = ReactEditor.findPath(editor, element)
  const [error, setError] = useState('')
  const [file, setFile] = useState<any>(() => element.url || null)

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
    <Draggable key={element.id} draggableId={element.id} index={path[0]}>
      {provided => (
        <div
          {...attributes}
          {...provided.draggableProps}
          ref={mergeRefs(provided.innerRef, attributes.ref)}
          className={`group first:mt-8 relative border-2 border-background-muted overflow-hidden rounded ${
            focused
              ? 'border-blue-200'
              : selected
              ? 'border-blue-400'
              : 'border-transparent'
          }`}
        >
          <div contentEditable={false}>
            <div
              className={`absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center mt-3 ${css`
                transform: translateX(-2rem);
              `}`}
            >
              <div
                className="rounded-sm bg-transparent hover:bg-background-muted w-6 h-8 p-1"
                {...provided.dragHandleProps}
              >
                <svg width="1em" height="1.5em" viewBox="0 0 16 24" fill="none">
                  <path
                    d="M3.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM12.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3.5 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
                    fill="#3F3F3F"
                  />
                </svg>
              </div>
            </div>

            {file ? (
              <img src={file} alt={caption} className="block w-full" />
            ) : (
              <div className="p-4">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/gif"
                  onChange={handleOnChange}
                />
              </div>
            )}
            <input
              className="bg-transparent text-body text-sm w-full mt-2 border border-transparent rounded-sm"
              type="text"
              placeholder="caption here"
              value={caption}
              onChange={handleCaption}
            />
            {error && (
              <p className="bg-danger px-4 py-2 rounded-md border-px text-body border-red-700">
                {error}
              </p>
            )}
            {children}
          </div>
        </div>
      )}
    </Draggable>
  )
}
