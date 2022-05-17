import {css, styled} from '@app/stitches.config'
import type * as Stitches from '@stitches/react'

export const textStyles = css({
  color: '$base-text-hight',
  display: 'block',
  fontFamily: '$base',
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
        lineHeight: '$3',
      },
      4: {
        fontSize: '$4',
        letterSpacing: '0.02em',
        lineHeight: '$3',
      },
      5: {
        fontSize: '$4',
        letterSpacing: '0.03em',
        lineHeight: '$2',
      },
      6: {
        fontSize: '$5',
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
      base: {
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
      base: {
        color: '$base-text-low',
      },
      alt: {
        color: '$base-text-low',
      },
      muted: {
        color: '$base-text-low',
      },
      opposite: {
        color: '$base-text-opposite',
      },
      contrast: {
        color: '$base-text-low',
      },
      primary: {
        color: '$primary-normal',
      },
      'primary-opposite': {
        color: '$primary-text-opposite',
      },
      secondary: {
        color: '$secondary-normal',
      },
      success: {
        color: '$success-normal',
      },
      warning: {
        color: '$warning-normal',
      },
      danger: {
        color: '$danger-normal',
      },
    },
  },

  baseVariants: {
    size: '3',
    color: 'base',
    fontWeight: 'base',
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

export const Text = styled('span', textStyles)

export type TextProps = Stitches.VariantProps<typeof Text>
