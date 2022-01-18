import {css, keyframes} from '@app/stitches.config'
import React, {PropsWithChildren} from 'react'
import type {TextProps} from './text'
import {Text} from './text'

export const overlayShow = keyframes({
  '0%': {opacity: 0},
  '100%': {opacity: 0.75},
})

export const contentShow = keyframes({
  '0%': {opacity: 0, transform: 'translate(-50%, -48%) scale(.96)'},
  '100%': {opacity: 1, transform: 'translate(-50%, -50%) scale(1)'},
})

export const overlayStyles = css({
  backgroundColor: '$background-neutral-strong',
  opacity: 0.75,
  position: 'fixed',
  inset: 0,
  zIndex: '$max',
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${overlayShow} 150ms cubic-bezier(0.16, 1, 0.3, 1)`,
  },
})

export const dialogContentStyles = css({
  backgroundColor: '$background-default',
  borderRadius: 6,
  boxShadow: 'hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px',
  position: 'fixed',
  zIndex: '$max',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90vw',
  maxWidth: '500px',
  maxHeight: '85vh',
  padding: '$6',
  display: 'flex',
  flexDirection: 'column',
  gap: '$4',
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${contentShow} 150ms cubic-bezier(0.16, 1, 0.3, 1)`,
    willChange: 'transform',
  },
  '&:focus': {outline: 'none'},
})

export function DialogTitle(props: PropsWithChildren<Omit<TextProps, 'size'>>) {
  return <Text size="7" {...props} />
}

export function DialogDescription(props: PropsWithChildren<Omit<TextProps, 'size' | 'color'>>) {
  return <Text size="3" color="muted" {...props} />
}

export const dialogFooterStyles = css({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '$4',
})
