import {styled} from 'shared/stitches.config'

const DEFAULT_TAG = 'span'

export const Text = styled(DEFAULT_TAG, {
  // Reset
  lineHeight: '1',
  margin: '0',
  fontWeight: '',
  fontVariantNumeric: 'tabular-nums',
  display: 'inline-block',

  // Custom
  color: 'inherit',

  variants: {
    size: {
      1: {
        fontSize: '$1',
      },
      2: {
        fontSize: '$2',
      },
      3: {
        fontSize: '$3',
      },
      4: {
        fontSize: '$4',
      },
      5: {
        fontSize: '$5',
        letterSpacing: '-.015em',
      },
      6: {
        fontSize: '$6',
        letterSpacing: '-.016em',
      },
    },
    color: {
      text: {
        color: '$text',
      },
      muted: {
        color: '$muted',
      },
      white: {
        color: 'white',
      },
      danger: {
        color: '$accentDanger',
      },
    },
  },
  defaultVariants: {
    color: 'text',
    size: '3',
  },
})
