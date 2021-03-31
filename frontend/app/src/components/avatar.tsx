import { styled } from '@mintter/ui/stitches.config';
import { Box } from '@mintter/ui/box';

export const Avatar = styled(Box, {
  $$size: '$space$6',
  width: '$$size',
  height: '$$size',
  borderRadius: '$round',
  backgroundColor: '$background-neutral',
  variants: {
    size: {
      1: {
        $$size: '$space$5',
      },
      2: {
        $$size: '$space$6',
      },
      3: {
        $$size: '$space$7',
      },
    },
  },
  defaultVariants: {
    size: '2',
  },
});

// TODO: receive the author (forwardRef)
