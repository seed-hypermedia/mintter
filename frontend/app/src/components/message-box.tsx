import * as React from 'react';
import { Separator } from './separator';
import { Box } from '@mintter/ui/box';
import { Text } from '@mintter/ui/text';
import { Button as UIButton, ButtonProps } from '@mintter/ui/button';

export function Root({ children }: any) {
  return (
    <>
      <Separator />
      <Box
        css={{
          backgroundColor: '$background-default',
          padding: '$6',
          display: 'grid',
          gridAutoFlow: 'row',
          alignItems: 'center',
          borderRadius: '$3',
          boxShadow:
            'inset 0 0 0 1px $colors$background-neutral, 0 0 0 1px $colors$background-neutral',
          textAlign: 'center',
          gap: '$5',
        }}
      >
        {children}
      </Box>
    </>
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
