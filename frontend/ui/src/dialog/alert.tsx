import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type {ComponentProps} from 'react'
// TODO: import components directly from its component file.
import {Box} from '../box'
import {Button} from '../button'
import {styled} from '../stitches.config'
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

function Trigger(props: ComponentProps<typeof AlertDialogPrimitive.Trigger> & ComponentProps<typeof Button>) {
  return (
    <AlertDialogPrimitive.Trigger asChild>
      <Button {...props} />
    </AlertDialogPrimitive.Trigger>
  )
}

const StyledContent = styled(AlertDialogPrimitive.Content, dialogContentStyles)

function Title(props: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title asChild>
      <DialogTitle {...props} />
    </AlertDialogPrimitive.Title>
  )
}

function Description(props: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description asChild>
      <DialogDescription {...props} />
    </AlertDialogPrimitive.Description>
  )
}

const Actions = styled(Box, dialogFooterStyles)

function Cancel(props: ComponentProps<typeof AlertDialogPrimitive.Cancel> & ComponentProps<typeof Button>) {
  return (
    <AlertDialogPrimitive.Cancel asChild>
      <Button variant="ghost" color="muted" size="1" {...props} />
    </AlertDialogPrimitive.Cancel>
  )
}

function Action(props: ComponentProps<typeof AlertDialogPrimitive.Action> & ComponentProps<typeof Button>) {
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
