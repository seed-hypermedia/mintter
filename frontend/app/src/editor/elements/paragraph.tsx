import * as React from 'react';
import type {
  ParagraphKeyOption,
  ParagraphPluginOptionsValues,
} from '@udecode/slate-plugins';
import { ELEMENT_PARAGRAPH } from './defaults';

export const paragraphOption = {};

export const DEFAULTS_PARAGRAPH: Record<
  ParagraphKeyOption,
  ParagraphPluginOptionsValues
> = {
  p: {
    component: Paragraph,
    type: ELEMENT_PARAGRAPH,
    rootProps: {
      as: 'p',
    },
  },
};

// TODO: fix types
export function Paragraph({
  as: Component = 'p',
  className = '',
  element,
  attributes,
  children,
  htmlAttributes = {},
  ...rest
}: any) {
  return (
    <Component
      data-element={element.type}
      className={`text-body rounded hover:bg-background-muted py-1 px-2 md:px-3 mx-0 md:-mx-3  ${className}`}
      {...attributes}
      {...htmlAttributes}
      {...rest}
    >
      {children}
    </Component>
  );
}
