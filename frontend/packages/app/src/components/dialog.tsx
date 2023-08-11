import {styled, Dialog, View, XStack, YStack} from '@mintter/ui'
import {useState} from 'react'

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

export function AppDialog({
  TriggerComponent,
  ContentComponent,
}: {
  TriggerComponent: React.FC
  ContentComponent: React.FC<{onClose?: () => void}>
}) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <Dialog.Trigger asChild>
        <TriggerComponent />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay key="overlay" opacity={0.5} />
        <Dialog.Content elevation="$2" key="content">
          <ContentComponent
            onClose={() => {
              setIsOpen(false)
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
