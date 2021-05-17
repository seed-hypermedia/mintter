import { useFocused, useSelected } from 'slate-react';
import { Text } from '@mintter/ui/text';
import { Box } from '@mintter/ui/box';
import type { TRenderElementProps } from '@udecode/slate-plugins-core';
import type * as documents from '@mintter/api/documents/v1alpha/documents_pb';
import { useQuote } from '@mintter/hooks';

export function QuoteElement({
  attributes,
  className,
  element,
  children,
}: TRenderElementProps<{
  type: ELEMENT_QUOTE;
  id: string;
  children: { text: string }[];
}>) {
  const focused = useFocused();
  const selected = useSelected();
  const quote = useQuote(element.id);
  console.log('🚀 ~ file: quote-element.tsx ~ line 21 ~ quote', quote);
  let qRender;

  if (quote.isLoading) {
    qRender = '...';
  }

  if (quote.isError) {
    qRender = `Error fetching block ${element.linkKey}`;
  }

  if (quote.isSuccess) {
    qRender = 'success!!'
    console.log(quote.data)
    return (
      <span {...attributes} data-quote-id={element.id}>
        {children}
        <Box
          as="span"
          contentEditable={false}
          css={{
            position: 'relative',
            overflow: 'hidden',
            '&:before': {
              content: '',
              position: 'absolute',
              display: 'block',
              width: '100%',
              height: focused && selected ? '100%' : 3,
              background: '$success-softer',
              bottom: -3,
              left: 0,
              zIndex: -1,
              transition: 'height 0.025s ease-out',
            },
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
