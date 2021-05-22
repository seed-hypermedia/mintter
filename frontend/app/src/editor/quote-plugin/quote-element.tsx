import { useFocused, useSelected } from 'slate-react';
import { Text } from '@mintter/ui/text';
import { Box } from '@mintter/ui/box';
import type { SPRenderElementProps } from '@udecode/slate-plugins-core';
import type * as documents from '@mintter/api/documents/v1alpha/documents_pb';
import { useQuote, toSlateQuote } from '@mintter/hooks';
import { ELEMENT_QUOTE } from './create-quote-plugin';
import { createId } from '@utils/create-id';
import { useEffect } from 'react';
import type { SlateQuote } from '../types';

export function QuoteElement({
  attributes,
  className,
  element,
  children,
}: SPRenderElementProps<SlateQuote>) {
  const focused = useFocused();
  const selected = useSelected();
  const quote = useQuote(element.url);
  let qRender;

  if (quote.isLoading) {
    qRender = <span>...</span>;
  }

  if (quote.isError) {
    qRender = <span>Error fetching quote {element.id}</span>;
  }

  if (quote.isSuccess && quote.data) {
    qRender = toSlateQuote(quote.data).map(({ text = '' }) => (
      <span>{text}</span>
    ));
    return (
      <span {...attributes} data-quote-id={element.id}>
        {children}
        <Box
          as="span"
          contentEditable={false}
          css={{
            position: 'relative',
            overflow: 'hidden',
            color:
              focused && selected ? '$secondary-stronger' : '$secondary-strong',
            '&:hover': {
              cursor: 'pointer',
              '&:before': {
                height: '100%',
              },
            },
          }}
        >
          {qRender}
        </Box>
      </span>
    );
  }

  return null;
}
