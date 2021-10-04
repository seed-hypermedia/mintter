import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type {PropsWithChildren} from 'react'
import React from 'react'
// TODO: import components directly from its component file.
import {Box} from '../box'
import type {ButtonProps} from '../button'
import {Button} from '../button'
import {styled} from '../stitches.config'
import type {TextProps} from '../text'
import {dialogContentStyles, DialogDescription, dialogFooterStyles, DialogTitle, overlayStyles} from './dialog-styles'

const StyledOverlay = styled(AlertDialogPrimitive.Overlay, overlayStyles)

function Root({children, ...props}: any) {
  return (
    <AlertDialogPrimitive.Root {...props}>
      <StyledOverlay />
      {children}
    </AlertDialogPrimitive.Root>
  )
}

function Trigger(props: PropsWithChildren<ButtonProps>) {
  return (
    <AlertDialogPrimitive.Trigger asChild>
      <Button {...props} />
    </AlertDialogPrimitive.Trigger>
  )
}

const StyledContent = styled(AlertDialogPrimitive.Content, dialogContentStyles)

function Title(props: PropsWithChildren<TextProps>) {
  return (
    <AlertDialogPrimitive.Title asChild>
      <DialogTitle {...props} />
    </AlertDialogPrimitive.Title>
  )
}

function Description(props: PropsWithChildren<TextProps>) {
  return (
    <AlertDialogPrimitive.Description asChild>
      <DialogDescription {...props} />
    </AlertDialogPrimitive.Description>
  )
}

const Actions = styled(Box, dialogFooterStyles)

function Cancel(props: PropsWithChildren<Omit<ButtonProps, 'variant' | 'color' | 'size'>>) {
  return (
    <AlertDialogPrimitive.Cancel asChild>
      <Button variant="ghost" color="muted" size="1" {...props} />
    </AlertDialogPrimitive.Cancel>
  )
}

function Action(props: PropsWithChildren<Omit<ButtonProps, 'size'>>) {
  return (
    <AlertDialogPrimitive.Action asChild>
      <Button size="1" {...props} />
    </AlertDialogPrimitive.Action>
  )
}

export const Alert = {
  Root,
  Trigger,
  Content: StyledContent,
  Title,
  Description,
  Actions,
  Cancel,
  Action,
}
