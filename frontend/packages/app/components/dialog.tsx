import {
  AlertDialog,
  Button,
  Dialog,
  Unspaced,
  XStack,
  YStack,
  styled,
} from '@mintter/ui'
import {X} from '@tamagui/lucide-icons'
import {FC, useMemo, useState} from 'react'
import {NavContextProvider, useNavigation} from '../utils/navigation'

export const DialogOverlay = styled(Dialog.Overlay, {
  // @ts-expect-error
  zIndex: '$max', // for somer reason this is required for the overlay to go behind the DialogContent. maybe because of the DialogContent position:fixed below
})

export const DialogContent = styled(YStack, {
  backgroundColor: '$base-background-normal',
  borderRadius: 6,
  boxShadow:
    'hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px',
  // @ts-expect-error
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90vw',
  maxWidth: '500px',
  maxHeight: '85vh',
  padding: '$4',
  display: 'flex',
  gap: '$4',
  borderWidth: 0,
})

export const AlertDialogContent = styled(AlertDialog.Content, {
  borderWidth: 0,
})

export const DialogFooter = styled(XStack, {
  justifyContent: 'flex-end',
  gap: '$4',
})

export const DialogTitle = styled(Dialog.Title, {
  fontSize: '$7',
})

export function DialogCloseButton() {
  return (
    <Unspaced>
      <Dialog.Close asChild>
        <Button
          position="absolute"
          top="$3"
          right="$3"
          size="$2"
          circular
          icon={X}
        />
      </Dialog.Close>
    </Unspaced>
  )
}

export const DialogDescription = Dialog.Description

function getComponent(isAlert?: boolean) {
  const Component = isAlert
    ? {
        Root: AlertDialog,
        Trigger: AlertDialog.Trigger,
        Portal: AlertDialog.Portal,
        Overlay: AlertDialog.Overlay,
        Content: AlertDialogContent,
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
  triggerLabel,
}: {
  TriggerComponent: React.FC<{
    onPress?: (e: any) => void
    children: React.ReactNode
  }>
  ContentComponent: React.FC<{onClose?: () => void; isOpen?: boolean}>
  isAlert?: boolean
  triggerLabel?: string
}) {
  const Component = getComponent(isAlert)
  const [isOpen, setIsOpen] = useState(false)
  const nav = useNavigation()
  return (
    <Component.Root onOpenChange={setIsOpen} open={isOpen}>
      <Component.Trigger asChild>
        <TriggerComponent
          onPress={(e) => {
            e.preventDefault()
            setIsOpen(true)
          }}
        >
          {triggerLabel}
        </TriggerComponent>
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
              isOpen={isOpen}
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
  options?: {isAlert?: boolean; onClose?: () => void},
) {
  const [openState, setOpenState] = useState<null | DialogInput>(null)
  const nav = useNavigation()

  const Component = getComponent(options?.isAlert)
  const onClose = options?.onClose
  return useMemo(() => {
    function open(input: DialogInput) {
      setOpenState(input)
    }

    function close() {
      setOpenState(null)
      onClose?.()
    }
    return {
      open,
      close,
      content: (
        <Component.Root
          modal
          onOpenChange={(isOpen) => {
            if (isOpen) throw new Error('Cannot open app dialog')
            close()
          }}
          open={!!openState}
        >
          <Component.Portal>
            <NavContextProvider value={nav}>
              <Component.Overlay height="100vh" width="100vw" onPress={close} />
              <Component.Content backgroundColor={'$background'}>
                {openState && (
                  <DialogContentComponent
                    input={openState}
                    onClose={() => {
                      setOpenState(null)
                      onClose?.()
                    }}
                  />
                )}
              </Component.Content>
            </NavContextProvider>
          </Component.Portal>
        </Component.Root>
      ),
    }
  }, [Component, DialogContentComponent, nav, openState, onClose])
}
