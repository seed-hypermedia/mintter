import { BeatLoader as Spinner } from 'react-spinners';
// TODO: remove spinner dependency, use a simple version

import { styled } from '@mintter/ui/stitches.config';
import { Box } from '@mintter/ui/box';

const AppSpinnerContainer = styled(Box, {
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'center',

  variants: {
    isCentered: {
      true: {
        margin: 'auto',
      },
    },
    isFullScreen: {
      true: {
        height: '100vh',
        width: '100vw',
      },
    },
  },
});

export const AppSpinner: React.FC<
  React.ComponentProps<typeof AppSpinnerContainer>
> = (props) => {
  return (
    // @ts-ignore
    <AppSpinnerContainer aria-label="loading spinner" {...props}>
      <Spinner color="var(--colors-primary-softer)" />
    </AppSpinnerContainer>
  );
};
