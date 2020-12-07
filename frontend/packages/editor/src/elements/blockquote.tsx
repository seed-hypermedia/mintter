import React from 'react'
import {
  BlockquoteKeyOption,
  BlockquotePluginOptionsValues,
} from '@udecode/slate-plugins'

export const ELEMENT_BLOCKQUOTE = 'blockquote'

export const BLOCKQUOTE_OPTIONS: Record<
  BlockquoteKeyOption,
  BlockquotePluginOptionsValues
> = {
  blockquote: {
    type: ELEMENT_BLOCKQUOTE,
    component: ({element, attributes, children, as: Component}) =>
      element.type === ELEMENT_BLOCKQUOTE ? (
        <Component
          {...attributes}
          className="mt-4 p-4 md:-mx-8 md:px-8 box-border w-auto block relative border-l-4 border-muted-hover bg-background-muted rounded-md rounded-tl-none rounded-bl-none"
        >
          <p className="italic text-xl font-light font-serif text-body">
            {children}
          </p>
        </Component>
      ) : null,
    rootProps: {
      as: 'blockquote',
    },
  },
}
