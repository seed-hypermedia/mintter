import {styled} from '../stitches.config'

export const Text = styled('span', {
  color: 'inherit',
  display: 'block',
  fontFamily: '$default',
  margin: 0,

  variants: {
    size: {
      1: {
        fontSize: '$1',
        letterSpacing: '0.01em',
        lineHeight: '$1',
      },
      2: {
        fontSize: '$2',
        letterSpacing: '0.01em',
        lineHeight: '$2',
      },
      3: {
        fontSize: '$3',
        letterSpacing: '0.01em',
        lineHeight: '$2',
      },
      4: {
        fontSize: '$4',
        letterSpacing: '0.02em',
        lineHeight: '$3',
      },
      5: {
        fontSize: '$3',
        letterSpacing: '0.03em',
        lineHeight: '$2',
      },
      6: {
        fontSize: '$4',
        letterSpacing: '0.02em',
        lineHeight: '$2',
      },
      7: {
        fontSize: '$5',
        letterSpacing: '0.01em',
        lineHeight: '$1',
      },
      8: {
        fontSize: '$6',
        letterSpacing: '0.01em',
        lineHeight: '$1',
        fontWeight: '$bold',
      },
      9: {
        fontSize: '$7',
        letterSpacing: '0.01em',
        lineHeight: '$1',
        fontWeight: '$bold',
      },
    },
    fontWeight: {
      default: {
        fontWeight: 'unset',
      },
      regular: {
        fontWeight: '$regular',
      },
      medium: {
        fontWeight: '$medium',
      },
      bold: {
        fontWeight: '$bold',
      },
    },
    alt: {
      true: {
        fontFamily: '$alt',
      },
    },
    color: {
      default: {
        color: '$text-default',
      },
      alt: {
        color: '$text-alt',
      },
      muted: {
        color: '$text-muted',
      },
      opposite: {
        color: '$text-opposite',
      },
      contrast: {
        color: '$text-contrast',
      },
      primary: {
        color: '$primary-default',
      },
      secondary: {
        color: '$secondary-default',
      },
      terciary: {
        color: '$terciary-default',
      },
      success: {
        color: '$success-default',
      },
      warning: {
        color: '$warning-default',
      },
      danger: {
        color: '$danger-default',
      },
    },
  },

  defaultVariants: {
    size: '3',
    color: 'default',
    fontWeight: 'default',
  },

  compoundVariants: [
    {
      alt: true,
      size: '9',
      css: {
        letterSpacing: '-0.01em',
      },
    },
    {
      alt: true,
      size: '8',
      css: {
        fontWeight: '$bold',
        letterSpacing: '-0.02em',
      },
    },
    {
      alt: true,
      size: '7',
      css: {
        fontWeight: '$bold',
        letterSpacing: '-0.02em',
      },
    },
    {
      alt: true,
      size: '6',
      css: {
        fontWeight: '$bold',
        letterSpacing: '-0.01em',
      },
    },
    {
      alt: true,
      size: '5',
      css: {
        fontWeight: '$bold',
        letterSpacing: '-0.01em',
      },
    },
  ],
})

export type TextProps = React.ComponentProps<typeof Text>
