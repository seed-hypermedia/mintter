import {styled} from '../stitches.config'

export const Text = styled('span', {
  display: 'block',
  margin: 0,

  variants: {
    variant: {
      huge: {
        fontSize: '$7',
        fontWeight: '$bold',
        letterSpacing: '0.01em',
        lineHeight: '$1',
      },
      h1: {
        fontSize: '$6',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$1',
      },
      h2: {
        fontSize: '$5',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$1',
      },
      h3: {
        fontSize: '$4',
        fontWeight: '$medium',
        letterSpacing: '0.02em',
        lineHeight: '$2',
      },
      h4: {
        fontSize: '$3',
        fontWeight: '$medium',
        letterSpacing: '0.03em',
        lineHeight: '$2',
      },
      large: {
        fontSize: '$4',
        fontWeight: '$regular',
        letterSpacing: '0.02em',
        lineHeight: '$3',
      },
      medium: {
        fontSize: '$3',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$2',
      },
      small: {
        fontSize: '$2',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$2',
      },
      tiny: {
        fontSize: '$1',
        fontWeight: '$medium',
        letterSpacing: '0.01em',
        lineHeight: '$1',
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

export type TextProps = React.ComponentProps<typeof Text>
