import * as React from 'react';

import { Box } from '@mintter/ui/box';
import { Button as UIButton /* , ButtonProps */ } from '@mintter/ui/button';
import { Text } from '@mintter/ui/text';

// import { Separator } from './separator';

export function Root({ children }: any) {
  return (
    <Box
      css={{
        backgroundColor: '$background-muted',
        padding: '$6',
        marginVertical: '$6',
        display: 'grid',
        gridAutoFlow: 'row',
        alignItems: 'center',
        borderRadius: '$3',
        boxShadow:
          'inset 0 0 0 1px $colors$background-neutral-soft, 0 0 0 1px $colors$background-neutral-soft',
        textAlign: 'center',
        gap: '$5',
      }}
    >
      {children}
    </Box>
  );
}

export function Title({ children }: any) {
  return <Text size="7">{children}</Text>;
}

// TODO: fix types
export function Button({ children, ...props }: any) {
  return (
    <UIButton variant="outlined" color="primary" {...props}>
      {children}
    </UIButton>
  );
}
