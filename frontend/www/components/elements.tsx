import React from 'react'
import {css} from 'emotion'
import {RenderElementProps} from 'slate-react'
import {nodeTypes} from '@mintter/editor'

export default function Element({
  attributes,
  children,
  element,
}: RenderElementProps) {
  switch (element.type) {
    case nodeTypes.typeH1:
      return (
        <h1
          {...attributes}
          className="text-4xl text-heading mt-8 leading-normal"
        >
          {children}
        </h1>
      )
    case nodeTypes.typeH2:
      return (
        <h2 {...attributes} className="text-3xl text-heading mt-8">
          {children}
        </h2>
      )
    case nodeTypes.typeH3:
      return (
        <h3 {...attributes} className="text-2xl text-heading mt-8">
          {children}
        </h3>
      )
    case nodeTypes.typeBlockquote:
      return (
        <blockquote
          {...attributes}
          className="mt-4 p-4 md:-mx-8 md:px-8 box-border w-auto block relative border-l-4 border-muted-hover bg-background-muted rounded-md rounded-tl-none rounded-bl-none"
        >
          <p className="italic text-xl font-light font-serif text-body">
            {children}
          </p>
        </blockquote>
      )
    case nodeTypes.typeUl:
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
    case nodeTypes.typeOl:
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
    case nodeTypes.typeLi:
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
    case nodeTypes.typeCode:
      return (
        <code
          {...attributes}
          className="bg-muted text-body px-2 py-1 rounded-sm border-none"
        >
          {children}
        </code>
      )
    case nodeTypes.typeLink:
      return (
        <a
          {...attributes}
          className={`text-primary cursor-pointer hover:text-primary-hover transition duration-200 ${css`
            p {
              display: inline;
            }
          `}`}
          onClick={() => window.open(element.url, '_blank')}
          href={element.url}
        >
          {children}
        </a>
      )
    case nodeTypes.typeP:
      return (
        <p {...attributes} className={`text-body mt-4`}>
          {children}
        </p>
      )

    case nodeTypes.typeSection:
      return (
        <div
          className="roundedpx-4 py-8 pt-4 mt-8 first:mt-0 -mx-1"
          {...attributes}
        >
          {children}
        </div>
      )
    default:
      return children
  }
}
