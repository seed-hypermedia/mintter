import {styled} from '@app/stitches.config'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import type {ComponentProps, PropsWithChildren} from 'react'
import {Box} from './box'
import {Button} from './button'
import {
  dialogContentStyles,
  dialogFooterStyles,
  overlayStyles,
} from './dialog-styles'
import type {TextProps} from './text'
import {Text} from './text'

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

function Title(props: PropsWithChildren<TextProps>) {
  return (
    <DialogPrimitive.Title asChild>
      <Text size="7" {...props} />
    </DialogPrimitive.Title>
  )
}

function Description(props: PropsWithChildren<TextProps>) {
  return (
    <DialogPrimitive.Description asChild>
      <Text size="3" color="muted" {...props} />
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
