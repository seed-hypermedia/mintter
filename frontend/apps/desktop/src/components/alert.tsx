import {Button, DialogContent, H3, SizableText} from '@mintter/ui'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type {ComponentProps, PropsWithChildren} from 'react'
import React from 'react'

function Root({children, ...props}: AlertDialogPrimitive.AlertDialogProps) {
  return (
    <AlertDialogPrimitive.Root {...props}>{children}</AlertDialogPrimitive.Root>
  )
}

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
  Content: DialogContent,
  Title,
  Description,
  Cancel,
  Action,
}
