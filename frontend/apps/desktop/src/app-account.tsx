import {DialogTitle} from '@shm/app/components/dialog'
import {eventStream} from '@shm/shared'
import {Add, Button, Dialog, SizableText, XStack, YStack} from '@shm/ui'
import {useEffect, useState} from 'react'

export type NamedKey = {
  name: string
  accountId: string
  publicKey: string
}

const currentAccount: NamedKey | null = null
let [dispatchWizardEvent, wizardEvents] = eventStream<boolean>()

export function CurrentAccountSidebarSection() {
  if (currentAccount === null) {
    return (
      <XStack>
        <Button
          icon={Add}
          chromeless
          borderRadius={0}
          f={1}
          onPress={() => {
            dispatchWizardEvent(true)
          }}
        >
          Add Account
        </Button>
      </XStack>
    )
  }

  return null
}

export function AccountWizardDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    wizardEvents.subscribe((val) => {
      console.log('== event subscription', val)
      setOpen(val)
    })
  }, [])

  return (
    <Dialog
      open={open}
      onOpenChange={(val: boolean) => {
        dispatchWizardEvent(val)
      }}
      defaultValue={false}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          height="100vh"
          bg={'#00000088'}
          width="100vw"
          animation="fast"
          opacity={0.8}
          enterStyle={{opacity: 0}}
          exitStyle={{opacity: 0}}
        />
        <Dialog.Content
          backgroundColor={'$background'}
          animation={[
            'fast',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{y: -10, opacity: 0}}
          exitStyle={{y: -10, opacity: 0}}
        >
          <DialogTitle>Account</DialogTitle>
          <YStack>
            <SizableText>Hello woorld</SizableText>
            <Button>Create a new Account</Button>
            <Button>Add existing account</Button>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
