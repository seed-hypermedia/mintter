import * as React from 'react';
import documents from '@mintter/api/documents/v1alpha/documents_pb';
import { Box } from '@mintter/ui-legacy/box';

// TODO: fix types
export function BlockList({ attributes, children, element }: any) {
  return (
    <Box
      as={element.listStyle === documents.ListStyle.NUMBER ? 'ol' : 'ul'}
      {...attributes}
    >
      {children}
    </Box>
  );
}
