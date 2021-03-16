import {generateVariantsForScale, styled} from '../stitches.config'

const Text = styled('span', {
  display: 'block',
  fontVariantNumeric: 'tabular-nums',
  margin: 0,
  '-webkit-font-smoothing': 'antialiased',
  '-moz-osx-font-smoothing': 'grayscale',

  variants: {
    color: generateVariantsForScale('colors', 'color'),
    font: generateVariantsForScale('fonts', 'fontFamily'),
    fontSize: generateVariantsForScale('fontSizes', 'fontSize'),
    fontWeight: generateVariantsForScale('fontWeights', 'fontWeight'),
    letterSpacing: generateVariantsForScale('letterSpacings', 'letterSpacing'),
    lineHeight: generateVariantsForScale('lineHeights', 'lineHeight'),

    alt: {
      true: {
        fontFamily: '$alt',
      },
    },
  },

  defaultVariants: {
    color: 'text-default',
    font: 'default',
    fontSize: 'md',
    fontWeight: 'regular',
  },
})

export {Text}
