import {styled} from '@mintter/ui/stitches.config'

const DEFAULT_TAG = 'div'

export const Container = styled(DEFAULT_TAG, {
  // Reset
  boxSizing: 'border-box',
  flexShrink: 0,

  // Custom
  width: '90%',
  marginHorizontal: 'auto',
  paddingHorizontal: '$4',

  variants: {
    size: {
      1: {
        maxWidth: '430px',
      },
      2: {
        maxWidth: '715px',
      },
      3: {
        maxWidth: '1145px',
      },
      4: {
        maxWidth: 'none',
      },
    },
  },
  defaultVariants: {
    size: '2',
  },
})
