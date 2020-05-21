import React, {RefObject} from 'react'
import {RenderElementProps, ReactEditor, useEditor} from 'slate-react'
import {Icons, Editor} from '@mintter/editor'
import {css} from 'emotion'

export function Section(
  {children, element, ...rest}: RenderElementProps,
  ref: RefObject<HTMLDivElement>,
) {
  const editor = useEditor()
  const path = ReactEditor.findPath(editor, element)
  const sectionChars = Editor.charCount(editor, path)
  const [inside, setInside] = React.useState<boolean>(false)

  function handleMouseEnter(e: React.SyntheticEvent<HTMLDivElement>) {
    setInside(true)
  }

  function handleMouseLeave(e: React.SyntheticEvent<HTMLDivElement>) {
    setInside(false)
  }

  return (
    <div
      {...rest}
      data-slate-type={element.type}
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative px-8 pt-12 pb-16 group bg-gray-200 ${css`
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
        className={`select-none absolute right-0 top-0 mt-4 mr-4 bg-gray-800 rounded shadows-md transition duration-200 theme-dark flex items-center pl-2 text-xs leading-none text-body ${
          inside
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      >
        <p className="font-bold border-r px-2">Section text</p>
        <p className={`text-body border-r px-2`}>
          <span>Characters:</span>{' '}
          {/* TODO: FIX avoid characters to jump when change chars number */}
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
