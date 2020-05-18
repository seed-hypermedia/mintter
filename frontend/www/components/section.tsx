import React, {RefObject} from 'react'
import {RenderElementProps, ReactEditor} from 'slate-react'
import {Icons} from '@mintter/editor'
import {Editor} from 'slate'

export function Section(
  {
    children,
    element,
    editor,
    ...rest
  }: RenderElementProps & {editor: ReactEditor},
  ref: RefObject<HTMLDivElement>,
) {
  const path = ReactEditor.findPath(editor, element)
  const sectionChars = Editor.string(editor, path).trim().length

  return (
    <div
      data-slate-type={element.type}
      // {...attributes}
      ref={ref}
      className={`relative px-8 py-8 pt-4 mt-8 first:mt-0 border-t first:border-0 border-muted group`}
    >
      <div
        contentEditable={false}
        className="absolute right-0 top-0 bg-gray-800 rounded shadows-md opacity-0 group-hover:opacity-100 transition duration-200 theme-dark flex items-center pl-2"
      >
        <p className="text-body font-bold text-xs leading-none border-r px-2">
          Section text
        </p>
        <p className="text-body text-xs leading-none border-r px-2">
          Characters: {sectionChars}
        </p>
        <p className="text-body text-xs leading-none border-r px-2">
          Royalties $0.02
        </p>
        <button
          className="px-3 py-2"
          onClick={() => alert('section settings clicked')}
        >
          <Icons.Settings
            // fill="currentColor"
            className="text-white"
            size={16}
            color="currentColor"
            strokeWidth="1"
          />
        </button>
      </div>
      {children}
    </div>
  )
}

export default React.forwardRef(Section)
