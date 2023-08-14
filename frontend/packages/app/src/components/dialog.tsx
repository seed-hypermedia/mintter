import {styled, Dialog, XStack, YStack, AlertDialog} from '@mintter/ui'
import {FC, useState} from 'react'
import {NavContextProvider, useNavigation} from '../utils/navigation'

export const DialogOverlay = styled(XStack, {
  backgroundColor: '$base-component-bg-normal',
  opacity: 0.7,
  // @ts-expect-error
  position: 'fixed',
  inset: 0,
  zIndex: '$max',
})

export const DialogContent = styled(YStack, {
  backgroundColor: '$base-background-normal',
  borderRadius: 6,
  boxShadow:
    'hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px',
  // @ts-expect-error
  position: 'fixed',
  zIndex: '$max',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90vw',
  maxWidth: '500px',
  maxHeight: '85vh',
  padding: '$6',
  display: 'flex',
  gap: '$4',
})

export const DialogFooter = styled(XStack, {
  justifyContent: 'flex-end',
  gap: '$4',
})

export const DialogTitle = Dialog.Title

export const DialogDescription = Dialog.Description

function getComponent(isAlert?: boolean) {
  const Component = isAlert
    ? {
        Root: AlertDialog,
        Trigger: AlertDialog.Trigger,
        Portal: AlertDialog.Portal,
        Overlay: AlertDialog.Overlay,
        Content: AlertDialog.Content,
      }
    : {
        Root: Dialog,
        Trigger: Dialog.Trigger,
        Portal: Dialog.Portal,
        Overlay: DialogOverlay,
        Content: DialogContent,
      }
  return Component
}

export function AppDialog({
  TriggerComponent,
  ContentComponent,
  isAlert,
}: {
  TriggerComponent: React.FC
  ContentComponent: React.FC<{onClose?: () => void}>
  isAlert?: boolean
}) {
  const Component = getComponent(isAlert)
  const [isOpen, setIsOpen] = useState(false)
  const nav = useNavigation()
  return (
    <Component.Root onOpenChange={setIsOpen} open={isOpen}>
      <Component.Trigger asChild>
        <TriggerComponent />
      </Component.Trigger>
      <Component.Portal>
        <NavContextProvider value={nav}>
          <Component.Overlay
            backgroundColor={'#00000088'}
            height="100vh"
            width="100vw"
            onPress={() => setIsOpen(false)}
          />
          <Component.Content backgroundColor={'$background'}>
            <ContentComponent
              onClose={() => {
                setIsOpen(false)
              }}
            />
          </Component.Content>
        </NavContextProvider>
      </Component.Portal>
    </Component.Root>
  )
}

export function useAppDialog<DialogInput>(
  DialogContentComponent: FC<{onClose: () => void; input: DialogInput}>,
  options?: {isAlert?: boolean},
) {
  const [openState, setOpenState] = useState<null | DialogInput>(null)
  const nav = useNavigation()

  const Component = getComponent(options?.isAlert)

  function open(input: DialogInput) {
    setOpenState(input)
  }

  function close() {
    setOpenState(null)
  }

  return {
    open,
    close,
    content: (
      <Component.Root
        onOpenChange={(isOpen) => {
          if (isOpen) throw new Error('Cannot open app dialog')
          close()
        }}
        open={!!openState}
      >
        <Component.Portal>
          <NavContextProvider value={nav}>
            <Component.Overlay
              backgroundColor={'#00000088'}
              height="100vh"
              width="100vw"
              onPress={close}
            />
            <Component.Content backgroundColor={'$background'}>
              {openState && (
                <DialogContentComponent
                  input={openState}
                  onClose={() => {
                    setOpenState(null)
                  }}
                />
              )}
            </Component.Content>
          </NavContextProvider>
        </Component.Portal>
      </Component.Root>
    ),
  }
}
