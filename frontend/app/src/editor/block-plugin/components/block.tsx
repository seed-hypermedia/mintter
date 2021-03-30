import * as React from 'react';
import { Box } from '@mintter/ui/box';
import { styled } from '@mintter/ui/stitches.config';

const StyledBlock = styled(Box, {
  paddingHorizontal: '$6',
  paddingVertical: '$2',
  borderRadius: '$2',
  listStyle: 'none',
  '&:hover': {
    // TODO: we need color with opacity
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
});

export const Block = ({ attributes, element, children, ...rest }: any) => {
  return (
    <>
      <StyledBlock as="li" {...attributes} {...rest}>
        {children}
      </StyledBlock>
    </>
  );
};
