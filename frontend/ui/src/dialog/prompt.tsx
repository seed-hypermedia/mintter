import type {TextProps} from '@mintter/ui/text'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import type {ComponentProps} from 'react'
import {Box} from '../box'
import {Button} from '../button'
import {styled} from '../stitches.config'
import {dialogContentStyles, DialogDescription, dialogFooterStyles, DialogTitle, overlayStyles} from './dialog-styles'

const StyledOverlay = styled(DialogPrimitive.Overlay, overlayStyles)

function Root({children, ...props}: any) {
  return (
    <DialogPrimitive.Root {...props}>
      <StyledOverlay />
      {children}
    </DialogPrimitive.Root>
  )
}

function Trigger(props: ComponentProps<typeof DialogPrimitive.Trigger> & ComponentProps<typeof Button>) {
  return (
    <DialogPrimitive.Trigger asChild>
      <Button {...props} />
    </DialogPrimitive.Trigger>
  )
}

const Content = styled(DialogPrimitive.Content, dialogContentStyles)

function Title(props: TextProps & {children: any}) {
  return (
    <DialogPrimitive.Title asChild>
      <DialogTitle {...props} />
    </DialogPrimitive.Title>
  )
}

function Description(props: TextProps & {children: any}) {
  return (
    <DialogPrimitive.Description asChild>
      <DialogDescription {...props} />
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
}
