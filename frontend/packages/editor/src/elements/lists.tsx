import React from 'react'
import {css} from 'emotion'
import {ListKeyOption, ListPluginOptionsValues} from '@udecode/slate-plugins'
import {PARAGRAPH_OPTIONS} from './paragraph'

export const ELEMENT_UL = 'ul'
export const ELEMENT_OL = 'ol'
export const ELEMENT_LI = 'li'

export const DEFAULTS_LIST: Record<ListKeyOption, ListPluginOptionsValues> = {
  ul: {
    component: ({attributes, element, as: Component, children}) =>
      element.type === ELEMENT_UL ? (
        <Component
          {...attributes}
          className={`list-inside ${css`
            li {
              div,
              p {
                &:before {
                  content: '::';
                  font-size: 12px;
                  font-weight: bold;
                  position: absolute;
                  left: 0;
                  top: 50%;
                  width: 16px;
                  transform: translate(-20px, -50%);
                  color: var(--color-body);
                  line-height: 1;
                  font-weight: bold;
                }
              }
            }

            ul {
              padding-left: 1rem;

              li {
                div,
                p {
                  &:before {
                    color: var(--color-body-muted);
                  }
                }
              }
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
                font-size: 12px;
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
          className={`text-body ${css`
            display: list-item;
            p,
            div {
              display: inline-block;
              margin: 0;
              padding: 0;
              position: relative;
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
