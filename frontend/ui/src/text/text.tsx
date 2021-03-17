import {styled} from '../stitches.config'

export type TextProps = React.ComponentProps<typeof Text>

export const Text = styled('span', {
  display: 'block',
  fontVariantNumeric: 'tabular-nums',
  margin: 0,
  '-webkit-font-smoothing': 'antialiased',
  '-moz-osx-font-smoothing': 'grayscale',

  variants: {
    variant: {
      'ui-huge': {
        fontFamily: '$default',
        fontSize: '$3xl',
        fontWeight: '$bold',
        letterSpacing: '0.01em',
        lineHeight: '$s',
      },
      'ui-h1': {
        fontFamily: '$default',
        fontSize: '$2xl',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$s',
      },
      'ui-h2': {
        fontFamily: '$default',
        fontSize: '$xl',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$s',
      },
      'ui-h3': {
        fontFamily: '$default',
        fontSize: '$l',
        fontWeight: '$medium',
        letterSpacing: '0.02em',
        lineHeight: '$m',
      },
      'ui-h4': {
        fontFamily: '$default',
        fontSize: '$m',
        fontWeight: '$medium',
        letterSpacing: '0.03em',
        lineHeight: '$m',
      },
      'ui-large': {
        fontFamily: '$default',
        fontSize: '$l',
        fontWeight: '$regular',
        letterSpacing: '0.02em',
        lineHeight: '$l',
      },
      'ui-medium': {
        fontFamily: '$default',
        fontSize: '$m',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$m',
      },
      'ui-small': {
        fontFamily: '$default',
        fontSize: '$s',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$m',
      },
      'ui-tiny': {
        fontFamily: '$default',
        fontSize: '$xs',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$s',
      },
      'doc-huge': {
        fontFamily: '$alt',
        fontSize: '$3xl',
        fontWeight: '$bold',
        letterSpacing: '-0.01em',
        lineHeight: '$s',
      },
      'doc-h1': {
        fontFamily: '$alt',
        fontSize: '$2xl',
        fontWeight: '$bold',
        letterSpacing: '-0.02em',
        lineHeight: '$s',
      },
      'doc-h2': {
        fontFamily: '$alt',
        fontSize: '$xl',
        fontWeight: '$bold',
        letterSpacing: '-0.02em',
        lineHeight: '$s',
      },
      'doc-h3': {
        fontFamily: '$alt',
        fontSize: '$l',
        fontWeight: '$bold',
        letterSpacing: '-0.01em',
        lineHeight: '$m',
      },
      'doc-large': {
        fontFamily: '$alt',
        fontSize: '$l',
        fontWeight: '$regular',
        letterSpacing: '0.02em',
        lineHeight: '$l',
      },
      'doc-small': {
        fontFamily: '$alt',
        fontSize: '$m',
        fontWeight: '$regular',
        letterSpacing: '0.01em',
        lineHeight: '$m',
      },
    },
    color: {
      default: {
        color: '$text-default',
      },
      alt: {
        color: '$text-alt',
      },
      mutted: {
        color: '$text-mutted',
      },
      opposite: {
        color: '$text-opposite',
      },
      contrast: {
        color: '$text-contrast',
      },
    },
  },

  defaultVariants: {
    variant: 'ui-medium',
    color: 'default',
  },
})
