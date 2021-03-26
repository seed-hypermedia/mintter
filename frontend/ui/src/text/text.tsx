import {styled} from '../stitches.config'

export type TextProps = React.ComponentProps<typeof Text>

export const Text = styled('span', {
  display: 'block',
  fontFamily: '$default',
  fontVariantNumeric: 'tabular-nums',
  margin: 0,

  variants: {
    variant: {
      huge: {
        fontSize: '$3xl',
        fontWeight: '$bold',
        letterSpacing: '0.01em',
        lineHeight: '$s',
      },
      h1: {
        fontSize: '$2xl',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$s',
      },
      h2: {
        fontSize: '$xl',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$s',
      },
      h3: {
        fontSize: '$l',
        fontWeight: '$medium',
        letterSpacing: '0.02em',
        lineHeight: '$m',
      },
      h4: {
        fontSize: '$m',
        fontWeight: '$medium',
        letterSpacing: '0.03em',
        lineHeight: '$m',
      },
      large: {
        fontSize: '$l',
        fontWeight: '$regular',
        letterSpacing: '0.02em',
        lineHeight: '$l',
      },
      medium: {
        fontSize: '$m',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$m',
      },
      small: {
        fontSize: '$s',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$m',
      },
      tiny: {
        fontSize: '$xs',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$s',
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
    },
  },

  defaultVariants: {
    variant: 'medium',
    color: 'default',
  },

  compoundVariants: [
    {
      alt: true,
      variant: 'huge',
      css: {
        letterSpacing: '-0.01em',
      },
    },
    {
      alt: true,
      variant: 'h1',
      css: {
        fontWeight: '$bold',
        letterSpacing: '-0.02em',
      },
    },
    {
      alt: true,
      variant: 'h2',
      css: {
        fontWeight: '$bold',
        letterSpacing: '-0.02em',
      },
    },
    {
      alt: true,
      variant: 'h3',
      css: {
        fontWeight: '$bold',
        letterSpacing: '-0.01em',
      },
    },
    {
      alt: true,
      variant: 'h4',
      css: {
        fontWeight: '$bold',
        letterSpacing: '-0.01em',
      },
    },
    {
      alt: true,
      variant: 'large',
      css: {},
    },
    {
      alt: true,
      variant: 'medium',
      css: {},
    },
    {
      alt: true,
      variant: 'small',
      css: {},
    },
    {
      alt: true,
      variant: 'tiny',
      css: {},
    },
  ],
})
