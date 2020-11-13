import React from 'react'
import {
  ParagraphKeyOption,
  ParagraphPluginOptionsValues,
} from '@udecode/slate-plugins'
import {ELEMENT_PARAGRAPH} from './defaults'

export const paragraphOption = {}

export const PARAGRAPH_OPTIONS: Record<
  ParagraphKeyOption,
  Required<ParagraphPluginOptionsValues>
> = {
  p: {
    component: Paragraph,
    type: ELEMENT_PARAGRAPH,
    rootProps: {
      as: 'p',
    },
  },
}

export function Paragraph({
  as: Component = 'p',
  className = '',
  element,
  attributes,
  ...rest
}) {
  return element.type === ELEMENT_PARAGRAPH ? (
    <Component
      className={`hover:bg-muted pt-6 px-2 md:px-3 mx-0 md:-mx-3 rounded ${className}`}
      {...attributes}
      {...rest}
    />
  ) : null
}
