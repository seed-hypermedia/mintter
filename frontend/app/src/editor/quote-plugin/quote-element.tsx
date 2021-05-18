import { useFocused, useSelected } from 'slate-react';
import { Text } from '@mintter/ui/text';
import { Box } from '@mintter/ui/box';
import type { TRenderElementProps } from '@udecode/slate-plugins-core';
import type * as documents from '@mintter/api/documents/v1alpha/documents_pb';
import { useQuote, SlateQuote, toSlateQuote} from '@mintter/hooks';
import {ELEMENT_QUOTE} from './create-quote-plugin'
import { createId } from '@utils/create-id';
import { useEffect } from 'react';

export function QuoteElement({
  attributes,
  className,
  element,
  children,
}: TRenderElementProps<SlateQuote>) {
  const focused = useFocused();
  const selected = useSelected();
  const quote = useQuote(element.url);
  let qRender: string;

  if (quote.isLoading) {
    qRender = '...';
  }

  if (quote.isError) {
    qRender = `Error fetching quote ${element.id}`;
  }

  if (quote.isSuccess) {

    qRender = toSlateQuote(quote.data).map(node => (
      <span>{node.text}</span>
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
            color: focused && selected ? '$secondary-stronger' : '$secondary-strong',
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
