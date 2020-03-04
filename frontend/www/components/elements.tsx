import React, {ElementType} from 'react'
import ReactDOM from 'react-dom'
import {css} from 'emotion'
import {RenderElementProps} from 'slate-react'
import {types} from '../pages/app/editor'

export interface ElementProps extends RenderElementProps {
  onAddBlock: () => void
}

export default function Element({
  attributes,
  children,
  element,
  onAddBlock,
}: ElementProps) {
  const Wrapper = ({children}) => (
    <Helper {...attributes} onAddBlock={onAddBlock}>
      {children}
    </Helper>
  )

  switch (element.type) {
    case types.HEADING_ONE:
      return (
        <Wrapper>
          <h1 className="text-4xl">{children}</h1>
        </Wrapper>
      )
    case types.HEADING_TWO:
      return (
        <Wrapper>
          <h2 className="text-3xl">{children}</h2>
        </Wrapper>
      )
    case types.HEADING_THREE:
      return (
        <Wrapper>
          <h3 className="text-2xl">{children}</h3>
        </Wrapper>
      )
    case types.BLOCK_QUOTE:
      return (
        <Wrapper>
          <blockquote className="w-full block relative p-4 border-l-4 border-gray-500">
            <p className="italic text-xl font-light font-serif">{children}</p>
          </blockquote>
        </Wrapper>
      )
    case types.BULLETED_LIST:
      return (
        <ul {...attributes} className="list-disc list-inside">
          {children}
        </ul>
      )
    case types.NUMBERED_LIST:
      return (
        <ol {...attributes} className="list-inside list-decimal">
          {children}
        </ol>
      )
    case types.LIST_ITEM:
      return (
        <Helper {...attributes} onAddBlock={onAddBlock}>
          <li>{children}</li>
        </Helper>
      )
    case types.LINK:
      return (
        <a
          className={`text-blue-500 cursor-pointer ${css`
            p {
              display: inline;
            }
          `}`}
          {...attributes}
          onClick={() => window.open(element.url, '_blank')}
          href={element.url}
        >
          {children}
        </a>
      )
    case types.TITLE:
      return (
        <h1 {...attributes} className="text-4xl font-bold">
          {children}
        </h1>
      )
    case types.DESCRIPTION:
      return (
        <p
          className="text-lg font-light text-gray-700 italic mb-4"
          {...attributes}
        >
          {children}
        </p>
      )
    case types.BLOCK:
      return (
        <div
          className="p-2 border rounded mt-4 border-gray-500"
          {...attributes}
        >
          {children}
        </div>
      )
    default:
      return (
        <Helper {...attributes} onAddBlock={onAddBlock}>
          <p>{children}</p>
        </Helper>
      )
  }
}

function Helper({children, onAddBlock, ...props}) {
  return (
    <div
      className={`relative flex mt-4 ${css`
        &:hover {
          .helper-actions {
            opacity: 1;
          }
        }
      `}`}
      {...props}
    >
      <div
        contentEditable={false}
        className={`helper-actions self-center absolute left-0 opacity-0 pr-3 ${css`
          transition: all 0.25s ease;
          transform: translateX(-100%);
        `}`}
      >
        <button
          onClick={() => {
            onAddBlock()
          }}
          className="font-bold text-lg text-gray-600 bg-gray-200 rounded p-2"
        >
          <svg viewBox="0 0 512 512" width="0.75em" height="0.75em">
            <path d="M492 236H276V20c0-11.046-8.954-20-20-20s-20 8.954-20 20v216H20c-11.046 0-20 8.954-20 20s8.954 20 20 20h216v216c0 11.046 8.954 20 20 20s20-8.954 20-20V276h216c11.046 0 20-8.954 20-20s-8.954-20-20-20z" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  )
}
