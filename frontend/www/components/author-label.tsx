import Tippy from '@tippyjs/react'
import {css} from 'emotion'

export function AuthorLabel({author, children = null}) {
  return (
    <Tippy
      delay={500}
      content={
        <span
          className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
            background-color: #333;
            color: #ccc;
          `}`}
        >
          {author}
        </span>
      }
    >
      <span>
        {children
          ? children
          : author === 'me'
          ? author
          : `...${author.slice(-16)}`}
      </span>
    </Tippy>
  )
}
