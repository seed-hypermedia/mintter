import React from 'react'
import {css} from 'emotion'
import {ListKeyOption, ListPluginOptionsValues} from '@udecode/slate-plugins'
import {PARAGRAPH_OPTIONS} from './paragraph'

export const ELEMENT_UL = 'ul'
export const ELEMENT_OL = 'ol'
export const ELEMENT_LI = 'li'

export const LIST_OPTIONS: Record<
  ListKeyOption,
  Required<ListPluginOptionsValues>
> = {
  ul: {
    component: ({attributes, element, as: Component, children}) =>
      element.type === ELEMENT_UL ? (
        <Component
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
        </Component>
      ) : null,
    type: ELEMENT_UL,
    rootProps: {
      as: 'ul',
    },
  },
  ol: {
    component: ({attributes, element, as: Component, children}) =>
      element.type === ELEMENT_OL ? (
        <Component
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
        </Component>
      ) : null,

    type: ELEMENT_OL,
    rootProps: {
      as: 'ol',
    },
  },
  li: {
    component: ({attributes, element, as: Component, children}) =>
      element.type === ELEMENT_LI ? (
        <Component
          {...attributes}
          className={`relative text-body ${css`
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
        </Component>
      ) : null,
    type: ELEMENT_LI,
    rootProps: {
      as: 'li',
    },
  },
  ...PARAGRAPH_OPTIONS,
}
