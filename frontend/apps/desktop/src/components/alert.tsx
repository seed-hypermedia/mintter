import {styled} from '@app/stitches.config'
import {Button, H3, SizableText} from '@mintter/ui'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type {ComponentProps, PropsWithChildren} from 'react'
import React from 'react'
import {Box} from './box'
import {dialogContentStyles, dialogFooterStyles} from './dialog-styles'

function Root({children, ...props}: AlertDialogPrimitive.AlertDialogProps) {
  return (
    <AlertDialogPrimitive.Root {...props}>{children}</AlertDialogPrimitive.Root>
  )
}

const StyledContent = styled(AlertDialogPrimitive.Content, dialogContentStyles)

function Title(props: any) {
  return (
    <AlertDialogPrimitive.Title asChild>
      <H3 {...props} />
    </AlertDialogPrimitive.Title>
  )
}

function Description(props: any) {
  return (
    <AlertDialogPrimitive.Description asChild>
      <SizableText {...props} />
    </AlertDialogPrimitive.Description>
  )
}

const Actions = styled(Box, dialogFooterStyles)
type ButtonProps = ComponentProps<typeof Button>
function Cancel({
  disabled = false,
  ...props
}: PropsWithChildren<
  Omit<ButtonProps, 'chromeless' | 'color' | 'size'> & {
    disabled?: boolean
  }
>) {
  return (
    <AlertDialogPrimitive.Cancel asChild>
      <Button chromeless size="$1" disabled={disabled} {...props} />
    </AlertDialogPrimitive.Cancel>
  )
}

function Action({
  disabled = false,
  ...props
}: PropsWithChildren<
  Omit<ButtonProps, 'size'> & {disabled?: boolean} & {
    onClick: React.MouseEventHandler<HTMLButtonElement>
  }
>) {
  return (
    <AlertDialogPrimitive.Action asChild>
      <Button size="$1" disabled={disabled} {...props} />
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
