import {styled, View, XStack, YStack} from '@mintter/ui'

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
