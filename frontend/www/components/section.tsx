import React, {RefObject} from 'react'
import {RenderElementProps, ReactEditor} from 'slate-react'
import {Icons} from '@mintter/editor'
import {css} from 'emotion'
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
      className={`relative px-8 pt-12 pb-16 group ${css`
        &:after {
          display: ${path[0] === 0 ? 'none' : 'block'};
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          z-index: 100;
          background-image: linear-gradient(
            to right,
            black 33%,
            rgba(255, 255, 255, 0) 0%
          );
          background-position: bottom;
          background-size: 10px 2px;
          background-repeat: repeat-x;
        }

        &:first {
          &:after {
            display: none;
          }
        }
      `}`}
    >
      <div
        contentEditable={false}
        className="absolute right-0 top-0 mt-4 mr-4 bg-gray-800 rounded shadows-md opacity-0 group-hover:opacity-100 transition duration-200 theme-dark flex items-center pl-2 text-xs leading-none text-body"
      >
        <p className="font-bold border-r px-2">Section text</p>
        <p className={`text-body border-r px-2 ${css``}`}>
          <span>Characters:</span>{' '}
          {/* TODO: FIX avoid characters to juno when change chars number */}
          <span className={`inline-block text-right`}>{sectionChars}</span>
        </p>
        <p className=" border-r px-2">Royalties $0.02</p>
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
