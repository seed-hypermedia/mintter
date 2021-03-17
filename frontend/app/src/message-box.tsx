import * as React from 'react';
import { Separator } from '@mintter/ui-legacy/separator';
import { Box } from '@mintter/ui-legacy/box';

export const MessageBox: React.FC = ({ children }) => (
  <>
    <Separator />
    <Box
      css={{
        bc: '$gray500',
        p: '$6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderRadius: '$3',
        boxShadow: 'inset 0 0 0 1px $colors$gray600, 0 0 0 1px $colors$gray600',
      }}
    >
      {children}
    </Box>
  </>
);
