import {styled} from '@app/stitches.config'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type {PropsWithChildren} from 'react'
import {Box} from './box'
import type {ButtonProps} from './button'
import {Button} from './button'
import {dialogContentStyles, dialogFooterStyles, overlayStyles} from './dialog-styles'
import type {TextProps} from './text'
import {Text} from './text'

const StyledOverlay = styled(AlertDialogPrimitive.Overlay, overlayStyles)

function Root({children, ...props}: any) {
  return <AlertDialogPrimitive.Root {...props}>{children}</AlertDialogPrimitive.Root>
}

const StyledContent = styled(AlertDialogPrimitive.Content, dialogContentStyles)

function Title(props: PropsWithChildren<TextProps>) {
  return (
    <AlertDialogPrimitive.Title asChild>
      <Text size="7" {...props} />
    </AlertDialogPrimitive.Title>
  )
}

function Description(props: PropsWithChildren<TextProps>) {
  return (
    <AlertDialogPrimitive.Description asChild>
      <Text size="3" color="muted" {...props} />
    </AlertDialogPrimitive.Description>
  )
}

const Actions = styled(Box, dialogFooterStyles)

function Cancel({
  disabled = false,
  ...props
}: PropsWithChildren<Omit<ButtonProps, 'variant' | 'color' | 'size'> & {disabled?: boolean}>) {
  return (
    <AlertDialogPrimitive.Cancel asChild>
      <Button variant="ghost" color="muted" size="1" disabled={disabled} {...props} />
    </AlertDialogPrimitive.Cancel>
  )
}

function Action({
  disabled = false,
  ...props
}: PropsWithChildren<Omit<ButtonProps, 'size'> & {disabled?: boolean} & {onClick: any}>) {
  return (
    <AlertDialogPrimitive.Action asChild>
      <Button size="1" disabled={disabled} {...props} />
    </AlertDialogPrimitive.Action>
  )
}

export const Alert = {
  ...AlertDialogPrimitive,
  Root,
  Trigger: AlertDialogPrimitive.Trigger,
  Content: StyledContent,
  Title,
  Description,
  Actions,
  Cancel,
  Action,
}
