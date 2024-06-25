import {AlertDialog, Button, DialogContent, H3, SizableText} from '@shm/ui'
import type {ComponentProps, PropsWithChildren} from 'react'
import React from 'react'

function Root({children, ...props}: AlertDialogPrimitive.AlertDialogProps) {
  return <AlertDialog {...props}>{children}</AlertDialog>
}

function Title(props: any) {
  return (
    <AlertDialog.Title asChild>
      <H3 {...props} />
    </AlertDialog.Title>
  )
}

function Description(props: any) {
  return (
    <AlertDialog.Description asChild>
      <SizableText {...props} />
    </AlertDialog.Description>
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
    <AlertDialog.Cancel asChild>
      <Button chromeless size="$1" disabled={disabled} {...props} />
    </AlertDialog.Cancel>
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
    <AlertDialog.Action asChild>
      <Button size="$1" disabled={disabled} {...props} />
    </AlertDialog.Action>
  )
}

export const Alert = {
  ...AlertDialog,
  Root,
  Trigger: AlertDialog.Trigger,
  Content: DialogContent,
  Title,
  Description,
  Cancel,
  Action,
}
