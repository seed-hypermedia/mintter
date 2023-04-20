import {styled} from '@app/stitches.config'
import {Button, H3, SizableText} from '@mintter/ui'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import type {ComponentProps} from 'react'
import {Box} from './box'
import {
  dialogContentStyles,
  dialogFooterStyles,
  overlayStyles,
} from './dialog-styles'

export const StyledOverlay = styled(DialogPrimitive.Overlay, overlayStyles)

function Root({children, ...props}: DialogPrimitive.DialogProps) {
  return (
    <DialogPrimitive.Root {...props}>
      <StyledOverlay />
      {children}
    </DialogPrimitive.Root>
  )
}

function Trigger(
  props: ComponentProps<typeof DialogPrimitive.Trigger> &
    ComponentProps<typeof Button>,
) {
  return (
    <DialogPrimitive.Trigger asChild>
      <Button {...props} />
    </DialogPrimitive.Trigger>
  )
}

const Content = styled(DialogPrimitive.Content, dialogContentStyles)

function Title(props: any) {
  return (
    <DialogPrimitive.Title asChild>
      <H3 {...props} />
    </DialogPrimitive.Title>
  )
}

function Description(props: any) {
  return (
    <DialogPrimitive.Description asChild>
      <SizableText {...props} />
    </DialogPrimitive.Description>
  )
}

const Actions = styled(Box, dialogFooterStyles)

export const Prompt = {
  Root,
  Trigger,
  Content,
  Title,
  Description,
  Actions,
  Close: DialogPrimitive.Close,
  Portal: DialogPrimitive.Portal,
}
