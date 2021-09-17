import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type {ComponentProps} from 'react'
// TODO: import components directly from its component file.
import {Box} from '../box'
import {Button} from '../button'
import {keyframes, styled} from '../stitches.config'
import {Text} from '../text'

const overlayShow = keyframes({
  '0%': {opacity: 0},
  '100%': {opacity: 0.75},
})

const contentShow = keyframes({
  '0%': {opacity: 0, transform: 'translate(-50%, -48%) scale(.96)'},
  '100%': {opacity: 1, transform: 'translate(-50%, -50%) scale(1)'},
})

const StyledOverlay = styled(AlertDialogPrimitive.Overlay, {
  backgroundColor: '#333',
  opacity: 0.75,
  position: 'fixed',
  inset: 0,
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${overlayShow} 150ms cubic-bezier(0.16, 1, 0.3, 1)`,
  },
})

function Root({children, ...props}) {
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

const StyledContent = styled(AlertDialogPrimitive.Content, {
  backgroundColor: 'white',
  borderRadius: 6,
  boxShadow: 'hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px',
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90vw',
  maxWidth: '500px',
  maxHeight: '85vh',
  padding: 25,
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${contentShow} 150ms cubic-bezier(0.16, 1, 0.3, 1)`,
    willChange: 'transform',
  },
  '&:focus': {outline: 'none'},
})

function Title(props: ComponentProps<typeof AlertDialogPrimitive.Title> & ComponentProps<typeof Text>) {
  return (
    <AlertDialogPrimitive.Title asChild>
      <Text size="7" {...props} />
    </AlertDialogPrimitive.Title>
  )
}

function Description(props: ComponentProps<typeof AlertDialogPrimitive.Description> & ComponentProps<typeof Text>) {
  return (
    <AlertDialogPrimitive.Description asChild>
      <Text size="2" color="muted" {...props} />
    </AlertDialogPrimitive.Description>
  )
}

function Actions({css, children, ...props}: ComponentProps<typeof Box>) {
  return (
    <Box css={{display: 'flex', justifyContent: 'flex-end', gap: '$4', ...css}} {...props}>
      {children}
    </Box>
  )
}

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
