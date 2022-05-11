import {css, styled} from '@app/stitches.config'
import type * as Stitches from '@stitches/react'

export const buttonStyles = css({
  all: 'unset',
  boxSizing: 'border-box',
  cursor: 'pointer',
  fontFamily: '$base',
  fontWeight: '$medium',
  textAlign: 'center',
  '&:disabled': {
    opacity: 0.5,
    pointerEvents: 'none',

    '&:hover': {
      cursor: 'not-allowed',
    },
  },

  '&:focus': {
    boxShadow: '0 0 0 2px $$focus-ring',
  },

  variants: {
    size: {
      0: {
        '$$outlined-border-size': '1px',
        fontSize: '$2',
        lineHeight: '$1',
        padding: '$1',
      },
      1: {
        '$$outlined-border-size': '1px',
        fontSize: '$2',
        lineHeight: '$1',
        paddingHorizontal: '$4',
        paddingVertical: '$2',
      },
      2: {
        '$$outlined-border-size': '1.5px',
        fontSize: '$3',
        lineHeight: '$2',
        paddingHorizontal: '$5',
        paddingVertical: '$3',
      },
      3: {
        '$$outlined-border-size': '2px',
        fontSize: '$4',
        fontWeight: '$bold',
        lineHeight: '$2',
        paddingHorizontal: '$6',
        paddingVertical: '$4',
      },
    },
    variant: {
      solid: {
        backgroundColor: '$$solid-background-normal',
        color: '$$solid-text-color',
        '&:hover': {
          backgroundColor: '$$solid-background-hover',
        },
        '&:active, &:focus': {
          backgroundColor: '$$solid-background-active',
        },
      },
      outlined: {
        backgroundColor: 'transparent',
        boxShadow:
          'inset 0px 0px 0px $$outlined-border-size $$outlined-border-color',
        color: '$$outlined-text-color-normal',
        '&:hover': {
          backgroundColor: '$$outlined-hovered-background-color',
        },
        '&:active, &:focus': {
          backgroundColor: '$$outlined-active-background-color',
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$$outlined-text-color-normal',
        '&:hover': {
          color: '$$outlined-text-color-hover',
          backgroundColor: '$$',
        },
        '&:active, &:focus': {
          color: '$$outlined-text-color-active',
        },
      },
    },
    shape: {
      rounded: {
        borderRadius: '$1',
      },
      pill: {
        borderRadius: '$pill',
      },
    },
    color: {
      primary: {
        '$$solid-background-normal': '$colors$primary-normal',
        '$$solid-background-hover': '$colors$primary-active',
        '$$solid-background-active': '$colors$primary-text-low',
        '$$outlined-border-color': '$colors$primary-border-normal',
        '$$solid-text-color': '$colors$primary-text-opposite',
        '$$outlined-text-color-normal': '$colors$primary-text-low',
        '$$outlined-text-color-hover': '$colors$primary-text-high',
        '$$outlined-text-color-active': '$colors$primary-text-high',
        '$$outlined-hovered-background-color':
          '$colors$primary-component-bg-hover',
        '$$outlined-active-background-color':
          '$colors$primary-component-bg-active',
        '$$focus-ring': '$colors$primary-border-subtle',
      },
      secondary: {
        '$$solid-background-normal': '$colors$secondary-normal',
        '$$solid-background-hover': '$colors$secondary-active',
        '$$solid-background-active': '$colors$secondary-text-low',
        '$$outlined-border-color': '$colors$secondary-border-normal',
        '$$solid-text-color': '$colors$secondary-text-opposite',
        '$$outlined-text-color-normal': '$colors$secondary-text-low',
        '$$outlined-text-color-hover': '$colors$secondary-text-high',
        '$$outlined-text-color-active': '$colors$secondary-text-high',
        '$$outlined-hovered-background-color':
          '$colors$secondary-component-bg-hover',
        '$$outlined-active-background-color':
          '$colors$secondary-component-bg-active',
        '$$focus-ring': '$colors$secondary-border-subtle',
      },
      success: {
        '$$solid-background-normal': '$colors$success-normal',
        '$$solid-background-hover': '$colors$success-active',
        '$$solid-background-active': '$colors$success-text-low',
        '$$outlined-border-color': '$colors$success-border-normal',
        '$$solid-text-color': '$colors$success-text-opposite',
        '$$outlined-text-color-normal': '$colors$success-text-low',
        '$$outlined-text-color-hover': '$colors$success-text-high',
        '$$outlined-text-color-active': '$colors$success-text-high',
        '$$outlined-hovered-background-color':
          '$colors$success-component-bg-hover',
        '$$outlined-active-background-color':
          '$colors$success-component-bg-active',
        '$$focus-ring': '$colors$success-border-subtle',
      },
      warning: {
        '$$solid-background-normal': '$colors$warning-normal',
        '$$solid-background-hover': '$colors$warning-active',
        '$$solid-background-active': '$colors$warning-text-low',
        '$$outlined-border-color': '$colors$warning-border-normal',
        '$$solid-text-color': '$colors$warning-text-opposite',
        '$$outlined-text-color-normal': '$colors$warning-text-low',
        '$$outlined-text-color-hover': '$colors$warning-text-high',
        '$$outlined-text-color-active': '$colors$warning-text-high',
        '$$outlined-hovered-background-color':
          '$colors$warning-component-bg-hover',
        '$$outlined-active-background-color':
          '$colors$warning-component-bg-active',
        '$$focus-ring': '$colors$warning-border-subtle',
      },
      danger: {
        '$$solid-background-normal': '$colors$danger-normal',
        '$$solid-background-hover': '$colors$danger-active',
        '$$solid-background-active': '$colors$danger-text-low',
        '$$outlined-border-color': '$colors$danger-border-normal',
        '$$solid-text-color': '$colors$danger-text-opposite',
        '$$outlined-text-color-normal': '$colors$danger-text-low',
        '$$outlined-text-color-hover': '$colors$danger-text-high',
        '$$outlined-text-color-active': '$colors$danger-text-high',
        '$$outlined-hovered-background-color':
          '$colors$danger-component-bg-hover',
        '$$outlined-active-background-color':
          '$colors$danger-component-bg-active',
        '$$focus-ring': '$colors$danger-border-subtle',
      },
      muted: {
        '$$solid-background-normal': '$colors$base-normal',
        '$$solid-background-hover': '$colors$base-active',
        '$$solid-background-active': '$colors$base-hover',
        '$$outlined-border-color': '$colors$base-border-normal',
        '$$solid-text-color': '$colors$base-text-opposite',
        '$$outlined-text-color-normal': '$colors$base-text-low',
        '$$outlined-text-color-hover': '$colors$base-text-high',
        '$$outlined-text-color-active': '$colors$base-text-high',
        '$$outlined-hovered-background-color':
          '$colors$base-component-bg-hover',
        '$$outlined-active-background-color':
          '$colors$base-component-bg-active',
        '$$focus-ring': '$colors$base-border-subtle',
      },
    },
  },

  defaultVariants: {
    variant: 'solid',
    size: '2',
    color: 'primary',
    shape: 'rounded',
  },
})

export const Button = styled('button', buttonStyles)

export type ButtonVariants = Stitches.VariantProps<typeof Button>
export type ButtonProps = ButtonVariants
