import * as React from 'react';
import type {
  ParagraphKeyOption,
  ParagraphPluginOptionsValues,
} from '@udecode/slate-plugins';
import { ELEMENT_PARAGRAPH } from './defaults';
import { Box } from '@mintter/ui/box';

// TODO: fix types
export const Paragraph: React.FC<any> = ({
  as = 'p',
  element,
  attributes,
  children,
  htmlAttributes = {},
  ...rest
}) => {
  return (
    <Box
      as={as}
      css={{
        fontSize: '$4',
        lineHeight: '$2',
      }}
      data-element={element.type}
      {...attributes}
      {...htmlAttributes}
      {...rest}
    >
      {children}
    </Box>
  );
};

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
