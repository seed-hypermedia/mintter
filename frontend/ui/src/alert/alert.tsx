import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import {ComponentProps} from 'react'

import {Box} from '../box'
import {Button} from '../button'
import {keyframes} from '../stitches.config'
import {Text} from '../text'

const showOverlay = keyframes({
  '0%': {opacity: 0},
  '100%': {opacity: 0.75},
})

const hideOverlay = keyframes({
  '0%': {opacity: 0.75},
  '100%': {opacity: 0},
})

function Root({
  children,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Root>) {
  console.log('root')

  return (
    <AlertDialogPrimitive.Root {...props}>
      <AlertDialogPrimitive.Overlay
        as={Box}
        css={{
          backgroundColor: '#333',
          backdropFilter: 'saturate(180%) blur(20px)',
          opacity: 0.75,
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          '&[data-state="open"]': {
            animation: `${showOverlay} 200ms ease-out`,
          },
          '&[data-state="closed"]': {
            animation: `${hideOverlay} 200ms ease-in`,
          },
        }}
      />
      {children}
    </AlertDialogPrimitive.Root>
  )
}

function Trigger(
  props: ComponentProps<typeof AlertDialogPrimitive.Trigger> &
    ComponentProps<typeof Button>,
) {
  return <AlertDialogPrimitive.Trigger as={Button} {...props} />
}

const showContent = keyframes({
  '0%': {opacity: 0, transform: 'translate(-50%, -40%)'},
  '100%': {opacity: 0.75, transform: 'translate(-50%, -50%)'},
})

const hideContent = keyframes({
  '0%': {opacity: 0.75, transform: 'translate(-50%, -50%)'},
  '100%': {opacity: 0, transform: 'translate(-50%, -40%)'},
})

function Content({
  css,
  children,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content> &
  ComponentProps<typeof Box>) {
  return (
    // TODO: Fix types
    // @ts-ignore
    <AlertDialogPrimitive.Content
      {...props}
      as={Box}
      onEscapeKeyDown={e => e.preventDefault()}
      onPointerDownOutside={e => e.preventDefault()}
      css={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 360,
        backgroundColor: '$background-default',
        borderRadius: 6,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '$5',
        '&[data-state="open"]': {
          animation: `${showContent} 300ms ease-out`,
        },
        '&[data-state="closed"]': {
          animation: `${hideContent} 300ms ease-in`,
        },
        // TODO: Fix types
        // @ts-ignore
        ...css,
      }}
    >
      {children}
    </AlertDialogPrimitive.Content>
  )
}

function Title(
  props: ComponentProps<typeof AlertDialogPrimitive.Title> &
    ComponentProps<typeof Text>,
) {
  return <AlertDialogPrimitive.Title as={Text} size="7" {...props} />
}

function Description(
  props: ComponentProps<typeof AlertDialogPrimitive.Description> &
    ComponentProps<typeof Text>,
) {
  return (
    <AlertDialogPrimitive.Description
      as={Text}
      size="2"
      color="muted"
      {...props}
    />
  )
}

function Actions({css, children, ...props}: ComponentProps<typeof Box>) {
  return (
    // TODO: Fix types
    // @ts-ignore
    <Box
      // TODO: Fix types
      // @ts-ignore
      css={{display: 'flex', justifyContent: 'flex-end', gap: '$4', ...css}}
      {...props}
    >
      {children}
    </Box>
  )
}

function Cancel(
  props: ComponentProps<typeof AlertDialogPrimitive.Cancel> &
    ComponentProps<typeof Button>,
) {
  return (
    <AlertDialogPrimitive.Cancel
      as={Button}
      variant="ghost"
      color="muted"
      size="1"
      {...props}
    />
  )
}

function Action(
  props: ComponentProps<typeof AlertDialogPrimitive.Action> &
    ComponentProps<typeof Button>,
) {
  return <AlertDialogPrimitive.Action as={Button} size="1" {...props} />
}

export const Alert = {
  Root,
  Trigger,
  Content,
  Title,
  Description,
  Actions,
  Cancel,
  Action,
}
