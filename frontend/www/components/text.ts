import {styled} from 'shared/stitches.config'

export const Text = styled('span', {
  // Reset
  lineHeight: '1',
  margin: '0',
  fontWeight: '',
  fontVariantNumeric: 'tabular-nums',
  display: 'block',

  // Custom
  // color: '$text',

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
      white: {
        color: 'white',
      },
    },
  },
  defaultVariants: {
    color: 'text',
  },
})
