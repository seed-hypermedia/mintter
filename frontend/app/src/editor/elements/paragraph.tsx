import type * as React from 'react';
import type {
  ParagraphKeyOption,
  ParagraphPluginOptionsValues,
} from '@udecode/slate-plugins';
import { ELEMENT_PARAGRAPH } from './defaults';
import { Text } from '@mintter/ui/text';

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
    <Text
      as={as}
      alt
      css={{
        fontSize: '$4',
        lineHeight: '$2',
        margin: 0,
        padding: 0,
      }}
      data-element={element.type}
      {...attributes}
      {...htmlAttributes}
      {...rest}
    >
      {children}
    </Text>
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
