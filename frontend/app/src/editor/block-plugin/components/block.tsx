import * as React from 'react';
import { Box } from '@mintter/ui-legacy/box';
import { styled } from '@mintter/ui-legacy/stitches.config';

const StyledBlock = styled(Box, {
  px: '$4',
  py: '$2',
  borderRadius: '$2',
  '&:hover': {
    // TODO: we need color with opacity
    bc: 'rgba(0,0,0,0.05)',
  },
});

export const Block = ({ attributes, element, children, ...rest }: any) => {
  return (
    <StyledBlock as="li" {...attributes} {...rest}>
      {children}
    </StyledBlock>
  );
};
