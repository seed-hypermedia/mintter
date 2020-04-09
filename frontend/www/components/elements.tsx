import React, {ElementType} from 'react'
import ReactDOM from 'react-dom'
import {css} from 'emotion'
import {RenderElementProps} from 'slate-react'
import {types} from '../pages/app/editor'
import {ListType, LINK, HeadingType, BLOCKQUOTE, CODE} from 'slate-plugins-next'

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
    case HeadingType.H1:
      return (
        <Wrapper>
          <h1 className="text-4xl text-heading mt-8 leading-normal">
            {children}
          </h1>
        </Wrapper>
      )
    case HeadingType.H2:
      return (
        <Wrapper>
          <h2 className="text-3xl text-heading mt-8">{children}</h2>
        </Wrapper>
      )
    case HeadingType.H3:
      return (
        <Wrapper>
          <h3 className="text-2xl text-heading mt-8">{children}</h3>
        </Wrapper>
      )
    case BLOCKQUOTE:
      return (
        <Wrapper>
          <blockquote className="mt-4 p-4 md:-mx-8 md:px-8 box-border w-auto block relative border-l-4 border-muted-hover bg-background-muted rounded-md rounded-tl-none rounded-bl-none">
            <p className="italic text-xl font-light font-serif text-body">
              {children}
            </p>
          </blockquote>
        </Wrapper>
      )
    case ListType.UL_LIST:
      return (
        <ul
          {...attributes}
          className={`list-inside ${css`
            list-style-type: disc;
            ul {
              list-style-type: circle;
              padding-left: 2rem;
            }

            ul ul {
              list-style-type: square;
            }
          `}`}
        >
          {children}
        </ul>
      )
    case ListType.OL_LIST:
      return (
        <ol
          {...attributes}
          className={`list-inside ${css`
            list-style: none;
            counter-reset: item;

            li {
              counter-increment: item;

              &:before {
                margin-right: 8px;
                content: counters(item, '.') '. ';
                display: inline-block;
              }
            }

            ol {
              padding-left: 2rem;
            }
          `}`}
        >
          {children}
        </ol>
      )
    case ListType.LIST_ITEM:
      return (
        <li
          {...attributes}
          className={`relative text-body mt-4 ${css`
            display: list-item;
            p,
            div {
              display: inline-block;
              margin: 0;
              padding: 0;
            }
          `}`}
        >
          {children}
        </li>
      )
    case CODE:
      return (
        <code
          {...attributes}
          className="bg-muted text-body px-2 py-1 rounded-sm border-none"
        >
          {children}
        </code>
      )
    case LINK:
      return (
        <a
          className={`text-primary cursor-pointer hover:text-primary-hover transition duration-200 ${css`
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
    default:
      return (
        <Wrapper>
          <p className="text-body mt-4">{children}</p>
        </Wrapper>
      )
  }
}

function Helper({children, ...props}) {
  return (
    <div
      className={`relative ${css`
        &:hover {
          .helper-actions {
            opacity: 1;
          }
        }
      `}`}
      {...props}
    >
      {/* <div
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
      </div> */}
      {children}
    </div>
  )
}
