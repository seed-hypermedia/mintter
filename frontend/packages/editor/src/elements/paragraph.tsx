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
    <Component {...attributes} {...rest} />
  ) : null
}
